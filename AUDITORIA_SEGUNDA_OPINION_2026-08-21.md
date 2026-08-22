# Segunda opinión sobre la auditoría de Codex — 21/08/2026

Revisión independiente del código de Atiende360 (backend FastAPI + dashboard Next.js,
~27.000 líneas) buscando específicamente lo que la auditoría del 20/08 no cubrió.

La auditoría de Codex es sólida en estrategia, posicionamiento, cumplimiento y en el
inventario de deuda operativa. Su punto ciego es el **código en sí**: se apoya en que
"70 tests pasan / build OK / npm audit limpio" como prueba de que el snapshot funciona.
Los tests no cubren los caminos de entrada, así que un bug que deja el producto sin
ningún canal entrante pasa por verde.

---

## 1. Bug crítico: ningún webhook entrante se procesaba

**Estado: corregido.**

En el commit `cb5120a` ("harden launch flows"), la función nueva
`release_webhook_event()` se insertó **dentro del cuerpo** de
`mark_webhook_event_once()`, partiéndola en dos:

```python
def mark_webhook_event_once(provider, event_key, payload_text=None) -> bool:
    ...
    if not provider_norm or not key_norm:
        return True
    #  <-- la función terminaba aquí: devolvía None para cualquier evento real

def release_webhook_event(provider, event_key) -> None:
    ...
    delete(...)          # liberar el claim
    insert(...)          # ...y acto seguido volvía a reclamarlo
    return True
```

Consecuencia en producción, en los seis puntos que la llaman:

| Llamada | Efecto real |
|---|---|
| `retell/webhook` | toda llamada de voz se descartaba como duplicada |
| `_cobrar_minutos_llamada` | ningún minuto se facturaba |
| `webhook/whatsapp` (Meta) | ningún mensaje de WhatsApp se contestaba |
| `webhook/whatsapp/twilio` | ídem |
| `billing/webhook` (Stripe) | ninguna alta, upgrade o renovación se aplicaba |

Todos los callers hacen `if not mark_webhook_event_once(...): return {"ok": True}` —
devolvían 200 al proveedor y tiraban el evento. **Silencioso: sin errores, sin logs,
sin tests rojos.** El backend respondía "ok" a todo mientras no hacía nada.

Además `release_webhook_event` re-insertaba el claim que acababa de borrar, de modo que
la ruta de reintento tampoco habría funcionado.

Corregido: `backend/webhook_dedupe.py` restaurado a su contrato original, con
`release_webhook_event` tolerante a fallos de storage. Añadido
`backend/tests/test_webhook_dedupe.py` (8 tests) que fija el contrato: primer evento
`True`, reentrega `False`, proveedores distintos no colisionan, `release` permite
reintento, claves largas se hashean, y un fallo de storage nunca descarta tráfico.

> Esto es lo primero que hay que desplegar. Nada de lo demás importa mientras esté roto.

---

## 2. `requiere_revision` nunca llegaba al agente

**Estado: corregido.**

El panel deja marcar un servicio como "requiere revisión" y
`create_appointment_validated()` lo comprueba:

```python
if servicio.get("requiere_revision"):
    return {"error": "... requiere revisión humana antes de agendar."}
```

Pero `_get_servicio()` no pedía esa columna en el `select`, así que el valor era siempre
`None` y la comprobación era código muerto. **La IA reservaba sola exactamente los
servicios que la clínica había marcado como "que no los reserve la IA".**

En el ICP de estética esto es el caso peligroso: inyectables y láser son justo lo que
se marca para valoración previa.

Corregido: la columna se incluye en el `select` y la restricción se aplica también en
`find_available_slots()` — antes ni siquiera se ofrecían huecos de un servicio no
reservable por IA, ahora tampoco de uno marcado para revisión. Tests en
`backend/tests/test_agenda_reglas.py`.

---

## 3. Buscar hueco disparaba decenas de consultas secuenciales

**Estado: corregido.**

`find_available_slots()` consultaba, **por cada slot candidato y por cada profesional**:
bloques de agenda, citas existentes y Google Calendar. Un día laborable con intervalos
de 30 min y 3 profesionales son del orden de 50-100 round-trips secuenciales —
incluyendo llamadas a la API de Google— antes de poder decir "tengo hueco a las 10:30".

En chat se traduce en lentitud. En una llamada de voz es la diferencia entre una pausa
natural y varios segundos de silencio en los que el paciente cuelga. Es el punto exacto
donde se pierde la conversión que el producto vende.

Corregido: nuevo `_cargar_contexto_dia()` que hace **una consulta por tipo de
restricción** (disponibilidad, citas, bloques, y una sola llamada a Google Calendar para
todo el día) y resuelve los solapes en memoria con `_solapa()`. Mismo resultado,
consultas constantes en lugar de lineales en el número de slots.

También se eliminó `_disponibilidad_prof_dia()`, que quedaba sin uso.

---

## 4. Recordatorios de cita que nunca llegaban

**Estado: corregido.**

`_enviar_recordatorio_sms()` solo intentaba SMS por Telnyx. Si `TELNYX_SMS_NUMBER` no
está configurado, `send_sms()` devuelve `False`, el job lanza excepción, reintenta 3
veces y queda en `fallido`. El paciente no recibe nada.

Existe `whatsapp.recordatorio_cita()` completamente implementado, y las clínicas que
completan el onboarding **sí** tienen WhatsApp conectado — pero el scheduler nunca lo
usaba.

Corregido: si el SMS no confirma la entrega, se intenta WhatsApp con las credenciales
Meta de la clínica (`_credenciales_whatsapp()`), y solo se da el job por fallido si
ningún canal confirma.

---

## 5. Reprogramar una cita se saltaba validaciones

**Estado: corregido.**

`mover_cita()` validaba bloques y citas del profesional, pero **no** la sala, **no**
Google Calendar, y si `gcal.mover_evento()` fallaba solo dejaba un `logger.warning`:
la cita quedaba en un horario en Supabase y en otro distinto en el calendario que el
equipo mira de verdad, marcada como `confirmada`.

`create_appointment_validated()` sí hace ambas cosas bien — la incoherencia era solo
del camino de reprogramación, que es justo el que más usa un paciente por teléfono.

Corregido: se comprueba sala y disponibilidad en Google Calendar antes de mover, y si
el calendario no confirma el cambio la cita queda en `sync_failed` (el mismo estado que
ya usa la creación) y el resultado devuelve `ok: false` para que el agente no prometa
al paciente algo que no está sincronizado.

---

## 6. Tokens de Google Calendar que nunca se renovaban por adelantado

**Estado: corregido.**

`get_credentials()` construía `Credentials(...)` sin `expiry`. Sin ese campo,
`creds.expired` es **siempre `False`**, así que el bloque de refresco nunca se ejecutaba.
Funcionaba de rebote porque la librería HTTP de Google refresca al recibir un 401 — pero
eso significa una petición fallida extra en cada operación de calendario, y el token
renovado nunca se persistía en Supabase.

Corregido: se guarda `expiry` al obtener los tokens, se reconstruye al leerlos, y el
refresco se dispara también cuando falta (auto-reparación para los tokens ya guardados).

---

## 7. Demo pública como proxy gratuito de OpenAI

**Estado: corregido.**

`/api/demo/chat` no está autenticado (correcto, es la demo) pero no limitaba el tamaño
de `message` ni del historial. Con el rate limit en 20 req/min por IP, alguien puede
enviar 20 prompts de 100.000 caracteres por minuto contra la cuenta de OpenAI de la
agencia. El rate limit además vive en un `Map` en memoria: en Vercel serverless cada
instancia tiene el suyo, así que el límite real es bastante mayor que 20.

Corregido: tope de 1.000 caracteres por mensaje, 800 por entrada de historial, y TTS
bajado de 1.000 a 600 caracteres.

---

## 8. Fuga de memoria en el rate limiter del dashboard

**Estado: corregido.**

`lib/rate-limit.ts` nunca purgaba el `Map`: cada IP nueva dejaba una entrada muerta
para siempre mientras viviera la instancia. Corregido con purga de buckets caducados a
partir de 5.000 entradas.

---

## 9. Router de Vapi muerto y sin autenticar

**Estado: eliminado.**

`backend/routers/vapi.py` quedó del stack anterior a la migración a Retell. No está
montado en `main.py`, pero es un endpoint `POST` sin firma ni autenticación que llama
directamente a `run_agent()`. Un `include_router` por descuido lo convierte en un LLM
abierto a internet a cargo de la cuenta de la agencia. Eliminado.

---

## Verificado correcto (no tocar sin motivo)

Contrastado a mano, coincide con lo que decía la auditoría anterior:

- **Aislamiento multi-tenant del BFF**: las 43 rutas de `dashboard/app/api` están
  cubiertas. Todas las de `/clinicas/[id]/*` llaman a `requireAccess` +
  `enforceClinicScope` en cada método HTTP. Las que no lo hacen (`billing/*`, `resumen`,
  `canales/numeros`) toman el `clinic_id` de la sesión y nunca del cuerpo de la petición
  — que es la forma correcta.
- **`ClinicaUpdate` es una lista blanca**: no incluye `plan`, `minutos_incluidos` ni
  `trial_expires_at`, así que una clínica no puede auto-ampliarse el plan por el
  `PATCH` que sí tiene permitido.
- **Firmas de webhook** Meta / Retell / Stripe / Twilio: correctas, con
  `hmac.compare_digest` y ventana temporal en Retell. Fallan cerradas en producción.
- **OAuth de Google Calendar**: state firmado + nonce en cookie httponly + TTL, y el
  arranque exige un token HMAC de 5 minutos emitido por el BFF autenticado.
- **SSRF**: `validate_public_http_url()` cubre esquema, credenciales, puerto y todas las
  IPs resueltas; el crawler revalida cada redirect y lo bloquea fuera de dominio.
- **Constraint anti-doble-reserva** (`citas_profesional_no_overlap`, migración 019):
  cierra la carrera que las comprobaciones de aplicación no pueden cerrar.
- **`/widget/[clinicId]`** es público y sin scope, pero es un Server Component: solo
  renderiza nombre y teléfonos. Los campos sensibles del `select` no llegan al navegador.

---

## Segunda tanda: lo que faltaba para pilotos

Cerrado después de la primera revisión.

### Handoff a humano con cola durable y dos destinatarios

Era el P0-4 de la auditoría de Codex. El aviso de "esto lo tiene que ver una persona"
se intentaba **una sola vez, en línea, con 5 s de timeout** y contra **un solo destino**
(el webhook de la clínica *o* el global, nunca los dos). Un webhook caído perdía la
escalada para siempre.

Ahora `entregar_aviso_escalada()` avisa a la clínica **y** a la agencia —durante un
piloto la agencia necesita ver las escaladas de sus clientes— y basta con que uno
confirme. Si no confirma ninguno, `_encolar_reintento_escalada()` deja un job
`escalada_humano` que el scheduler reintenta con el backoff normal (3 intentos) y que
queda visible como `fallido` en `/admin/clinicas/{id}/jobs`.

El prompt del agente se ajustó para que diga la verdad: que ha quedado registrada y que
el aviso se sigue intentando, sin dar nunca una hora concreta de respuesta.

### Leader lock del scheduler

APScheduler arranca dentro de cada réplica de Railway. Los jobs de la tabla `jobs` ya
tenían claim atómico, pero `_sync_all_gcal` y `_reset_periodos_facturacion` no, y se
ejecutaban una vez por réplica: sincronizaciones duplicadas de Google Calendar y resets
de contadores de minutos pisándose entre sí.

Nueva función `try_acquire_scheduler_lock()` (migración 020) y `_tomar_lock()` en el
scheduler. **Falla en abierto**: si la RPC aún no está desplegada se ejecuta sin lock,
porque duplicar trabajo idempotente es preferible a dejar de hacerlo.

### Preflight: "¿puede esta clínica dar una cita de verdad?"

El checklist de onboarding comprobaba prompt, calendario y número. No comprobaba las
dos cosas sin las cuales el agente **no puede agendar nada** por mucho que el teléfono
suene:

- sin servicios activos y reservables por IA, `_get_servicio()` no encuentra nada y todo
  acaba en "deriva a humano";
- sin profesionales activos con `acepta_reservas_ia`, no hay a quién asignar el hueco.

Es exactamente el escenario "demo delante del cliente y la IA no da una sola cita".
Nuevo `GET /admin/clinicas/{id}/preflight` que devuelve `puede_agendar`, la lista de
bloqueantes y los checks con su enlace al panel. El checklist del panel ahora se
alimenta de ahí, así que panel y agente coinciden en qué significa "lista para atender".

### Bloques de agenda heredados

`_bloques_activos()` ignoraba los bloques que solo tenían el nombre en el campo TEXT
`profesional` (sin `profesional_id`): un bloqueo antiguo no impedía reservar encima.
Ahora se tratan como globales — perder un hueco es menos grave que agendar sobre una
ausencia real.

### Búsqueda de huecos fuera del event loop

`find_available_slots()` es ahora un envoltorio sobre `_find_available_slots_sync()` que
corre en `asyncio.to_thread`. Igual las cargas de contexto del agente
(`_cargar_clinica`, `_cargar_contexto_prompt`). El cliente de Supabase es síncrono: dentro
del event loop, una consulta bloqueaba a todas las conversaciones simultáneas.

### Columna de email consolidada

La 003 creó `notif_email` y la 012 `notification_email`. El backend escribía en una y
leía la otra, así que el email de notificación no lo usaba nadie. La 020 hace backfill y
borra la duplicada; `configuracion.py` escribe ya en la canónica.

### Google Calendar caído ahora es alertable

`_gcal_ocupado()` sigue fallando en abierto a propósito (bloquear la agenda porque Google
no responde sería peor durante una llamada), pero se registra como `ERROR` y no como
`warning`: implica que se puede reservar sobre un evento que existe y nadie lo verá
hasta que ocurra.

---

## Lo que se ve con acceso a la base de datos

Con el CLI de Supabase autenticado se pudo contrastar el código contra producción.
Resumen: **el esquema está bien, los datos están vacíos, y ninguna clínica puede
atender ni agendar hoy.**

### Recuento real

| Tabla | Filas |
|---|---|
| clinicas | 2 |
| **servicios** | **0** |
| **profesionales** | **0** |
| pacientes | 0 |
| conversaciones | 0 |
| citas | 11 |
| jobs | 8 |
| webhook_events | 1 |
| demo_requests | 0 |

### Ninguna de las dos clínicas puede dar una cita

Las dos ("Clinica Prueba", alta 19/05, dental; "Clínica Noguer", alta 25/05, psicología)
están así:

- **0 servicios y 0 profesionales** → `_get_servicio()` no encuentra nada y
  `_get_profesionales_validos()` devuelve vacío. El agente deriva a humano
  absolutamente todo. Es exactamente el escenario que detecta el preflight nuevo.
- **0 días de horario** configurados.
- **Sin número de voz** ninguna de las dos (`telefono_ia IS NULL`).
- **Sin prompt personalizado.**
- **Sin webhook de aviso** → una escalada no notificaría a nadie.
- …y sin embargo **`onboarding_ok = true` en ambas**. El panel daba el onboarding por
  terminado. Es justo la mentira que corrige el preflight.

### Las 11 citas no las creó el agente

8 con `origen = google_calendar` (importadas por el job de sync) y 3 `manual`. **Cero**
de `ia_chat`, `ia_whatsapp` o `ia_llamada`. Con `conversaciones = 0` y
`webhook_events = 1`, la conclusión es que **por los canales de entrada no ha pasado
nada real todavía** — consistente con el bug del dedupe.

### Los 8 jobs "ejecutados" no enviaron nada

**Estado: corregido.** Los 8 recordatorios figuraban como `ejecutado`. Ninguno envió
nada: las citas no tienen paciente asociado (`pacientes = 0`), y
`_enviar_recordatorio_sms()` hacía `return` en silencio en ese caso, con lo que
`_ejecutar_job()` lo marcaba como éxito. El panel habría dicho "8 recordatorios
enviados" con cero entregas.

Nueva excepción `JobOmitido`: un job sin nada que enviar queda `cancelado` con el motivo,
no `ejecutado` ni `fallido` (no quema reintentos ni finge una entrega). Aplicado también
a los seguimientos comerciales, que descartaban en silencio por falta de consentimiento.

### Lo que sí estaba bien

- Las 19 tablas del esquema existen: las migraciones 001-019 están aplicadas.
- La constraint `citas_profesional_no_overlap` de la 019 existe en producción.
- **0 bloques de agenda heredados** con el campo TEXT `profesional` — el arreglo
  conservador que hice es un no-op en la práctica. Sin riesgo de sobre-bloquear.
- `notification_email` existía pero con **0 filas con dato**: el `DROP COLUMN` de la 020
  no perdió nada. Verificado antes de aplicar.

### Advisors de Supabase: 6 avisos, ningún error

Cuatro arreglados dentro de la 020: `search_path` en los triggers `update_updated_at` y
`update_citas_updated_at`, y la política `clinica_usuarios_select_own` reescrita con
`(SELECT auth.uid())` para que no se reevalúe por fila.

Quedan dos, ambos asumidos a conciencia:

- `btree_gist` instalado en el esquema `public`. Moverlo exigiría tirar la constraint
  anti-doble-reserva. No compensa.
- `get_auth_clinic_id()` es ejecutable por el rol `authenticated` vía RPC. Es
  **necesario**: las políticas RLS la invocan y se evalúan con los privilegios de quien
  consulta. Lo único que expone es el `clinic_id` propio, que el usuario ya conoce.

Aparte, en el dashboard de Supabase: **activa "Leaked Password Protection"** (Auth →
Policies). Es un clic y no se puede hacer por SQL.

### Migración 020 aplicada

Aplicada a producción y verificada: `scheduler_locks` creada, `try_acquire_scheduler_lock`
disponible, `jobs_tipo_check` acepta `escalada_humano`, índice de escaladas pendientes
creado, `notification_email` eliminada y política optimizada.

---

## Cómo desplegar

El código es seguro de desplegar **antes** de la migración: el leader lock falla en
abierto, el encolado de escaladas está en `try/except` y `notif_email` existe desde la
003. Aun así, el orden recomendado es:

1. **Aplicar la migración 020** en Supabase
   (`backend/database/migrations/020_pilot_readiness.sql`, espejo en
   `supabase/migrations/20260821001000_pilot_readiness.sql`).
   Ojo: hace `DROP COLUMN notification_email` después de copiar los datos a
   `notif_email`. Es irreversible; el backfill va en la misma transacción.
2. **Desplegar el backend** a Railway. Verificar `GET /health` → `database: true`,
   `scheduler.running: true`.
3. **Desplegar el dashboard** a Vercel.
4. **Comprobar el dedupe en vivo**: hacer una llamada de prueba y confirmar que aparece
   la conversación y que los minutos se descuentan. Era lo que estaba roto.
5. **Pasar el preflight de cada clínica piloto**:
   `GET /admin/clinicas/{id}/preflight` → `puede_agendar: true`. Si no, el panel ya
   señala qué falta y con qué enlace arreglarlo.

## Sigue pendiente (fuera del alcance del código)

- Los gates externos que ya listaba Codex: Stripe de producción, Pixel/CAPI,
  identidad legal / DPA / EIPD, y una llamada real con handoff probado end to end.
- No existe envío de email en el backend: `notif_email` se guarda pero el único canal de
  aviso real es el webhook. O se conecta un proveedor, o el panel debe dejar de pedir un
  email que no se usa.
- Las cinco pruebas obligatorias antes de abrir un piloto: FAQ, reserva, cambio,
  cancelación y urgencia/handoff. El preflight comprueba la configuración, no el
  comportamiento.

## Verificación de este cambio

- Backend: **119 tests pasan** (70 previos + 49 nuevos).
- Los tests nuevos se verificaron reintroduciendo el bug del dedupe: **16 fallos**.
  No son decorativos.
- Dashboard: `npx tsc --noEmit` sin errores y build de producción completo.
- Cobertura nueva: `test_webhook_dedupe.py`, `test_canales_integracion.py` (entra por
  HTTP con firma real por cada canal), `test_agenda_reglas.py`, `test_handoff.py`,
  `test_scheduler_lock.py`, `test_preflight.py`.
- Una migración nueva: `020_pilot_readiness.sql`.
