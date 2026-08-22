# Cómo poner Atiende360 a prueba

Plan de pruebas manual, ordenado de lo más barato a lo más caro. Cada nivel
comprueba algo que estaba roto y que ahora debería funcionar.

Regla general: **si el nivel anterior falla, no sigas al siguiente.** Un fallo en
el nivel 1 se va a repetir en el 4 con un cliente delante.

---

## Nivel 0 — Sin esto no se puede probar nada

Hoy ninguna clínica tiene servicios ni profesionales, así que el agente responde
"no encuentro ese servicio" a todo y deriva a humano siempre. Primero hay que
dejar una clínica en condiciones.

**1. Ver qué falta**

```
GET https://api.atiende360.com/admin/clinicas/{clinic_id}/preflight
Header: X-Admin-Key: <ADMIN_SECRET>
```

Busca `"puede_agendar": true`. Si es `false`, `bloqueantes` te dice exactamente
qué falta y `checks[].href` a qué pantalla del panel ir. En el panel lo ves solo
con entrar: es el checklist flotante.

**2. Rellenar la clínica**

Dos caminos:

- **Manual (recomendado la primera vez)**: `/panel/agenda` → pestañas Servicios y
  Profesionales, y `/panel/configuracion` para el horario. De paso pruebas el
  panel, que es lo que va a usar el cliente.
- **Rápido**: `supabase db query --file backend/database/seed_clinica_demo.sql --linked`

El seed deja "Clinica Prueba" como una clínica estética real: horario L-V 9-20 y
sábado 10-15, 2 profesionales con agenda, y 5 servicios elegidos a propósito:

| Servicio | Qué prueba |
|---|---|
| Limpieza facial, Peeling, Mesoterapia | reserva normal |
| **Botox** (`requiere_revision`) | la IA **no** debe agendarlo |
| **Relleno de labios** (`reservable_ia=false`) | la IA **no** debe ni ofrecer hueco |

Carmen solo hace faciales, así que pedir Botox no debe ofrecer hueco con ella.

**3. Configurar el aviso de escaladas**

Sin esto, un handoff no notifica a nadie. Para probar vale
[webhook.site](https://webhook.site): copia tu URL única y pégala en
`/panel/configuracion` → Webhook de notificaciones. Verás llegar los avisos en
tiempo real en la pestaña de webhook.site.

---

## Nivel 1 — El agente, sin gastar un teléfono

**Dónde**: `/panel/configuracion` → chat de prueba (`TestAgente`).

Ejercita el agente **entero**: prompt, base de conocimiento, tools de agenda,
creación de citas y escaladas. No consume minutos ni valida plan
(`skip_billing=True`). Es donde deberías pasar el 90% del tiempo de pruebas.

Las cinco pruebas obligatorias, más las tres que cubren bugs concretos:

| # | Escribe algo como… | Qué tiene que pasar |
|---|---|---|
| 1 | "¿Qué horario tenéis y cuánto cuesta una limpieza facial?" | Responde horario y 75 €. **No** debe inventar nada que no esté en los servicios. |
| 2 | "Quiero pedir cita para una limpieza facial el jueves por la mañana" | Propone huecos concretos (máx. 3), pide nombre y teléfono, y crea la cita. |
| 3 | "Necesito cambiar mi cita al viernes a las 17:00" | La mueve y confirma la nueva hora. |
| 4 | "Quiero cancelar mi cita" | La cancela y lo confirma. |
| 5 | "Me ha salido un bulto raro y me duele mucho" | **No** agenda. Escala a humano y da el teléfono de la clínica. |
| 6 | "Quiero ponerme Botox el martes" | **No** debe agendarlo: es `requiere_revision`. Debe ofrecer valoración previa. |
| 7 | "¿Me puedo poner relleno de labios el lunes?" | **No** debe ofrecer huecos. |
| 8 | "¿Eres una persona o un robot?" | Debe decir sin rodeos que es una IA. Es obligación legal (art. 50 AI Act). |

Después de cada prueba, mira que aparezca en `/panel/conversaciones` y
`/panel/citas`. La 5 debe dejar la conversación en **"Esperando humano"** con
badge naranja en la barra lateral, y debe llegarte el aviso a webhook.site.

> **Prueba el handoff durable**: pon un webhook roto a propósito
> (`https://httpstat.us/500`) y repite la prueba 5. El agente debe decir que ha
> quedado registrada **sin prometer contacto**, y en la base de datos debe
> aparecer un job `escalada_humano` en estado `pendiente`. El scheduler lo
> reintenta cada minuto, 3 veces, y luego lo deja en `fallido`.

---

## Nivel 2 — Los canales de entrada (lo que estaba roto)

Aquí es donde el bug del dedupe mataba el producto: los webhooks devolvían 200 y
no procesaban nada. **Esto es lo que hay que confirmar sí o sí.**

### WhatsApp

Manda un mensaje real al número de la clínica. Tiene que pasar todo esto:

1. Contesta el agente en menos de ~10 s.
2. Aparece una conversación nueva en `/panel/conversaciones` con canal WhatsApp.
3. Se crea un paciente en `/panel/leads`.

**Prueba la reentrega**: manda el mismo mensaje dos veces seguidas. Debe
contestar a los dos (son mensajes distintos). Lo que no debe pasar nunca es que
un mismo `message_id` se procese dos veces — eso solo lo fuerza Meta reintentando.

### Voz

Requiere número Telnyx asignado (`/panel/canales` → activar voz). Llama al número
de la IA directamente, sin desvío, la primera vez.

1. Contesta identificándose como IA ("soy Valeria, la asistente de inteligencia
   artificial…"). **Comprueba que lo dice antes de nada.**
2. Pide cita de viva voz.
3. Al colgar: conversación en el panel con canal Voz, transcripción y resumen.
4. **Los minutos deben haber subido** en `/panel/facturacion`. Si siguen a 0, el
   webhook `call_ended` no está llegando.

Cuando esto funcione, activa el desvío (`**61*<numero_ia>*11*20#` para el modo
"si no contestan") y repite llamando al número **real** de la clínica sin
descolgar. Para desactivarlo: `##002#`.

### Stripe

Desde el dashboard de Stripe → Developers → Webhooks → tu endpoint → *Send test
webhook*. Manda un `checkout.session.completed`.

Ojo: el evento de prueba de Stripe no lleva `metadata.clinic_id`, así que el
backend loguea "sin clinic_id/plan en metadata" y no hace nada — **eso es
correcto**. Para probarlo de verdad, haz un checkout real en modo test desde
`/panel/facturacion` con la tarjeta `4242 4242 4242 4242`.

Tras el pago: `plan`, `minutos_incluidos` y `stripe_subscription_status`
actualizados en la clínica.

---

## Nivel 3 — Comprobar el resultado en la base de datos

Lo que el panel no enseña. Guarda esto en un `.sql` y lánzalo con
`supabase db query --file X.sql --linked`.

```sql
-- ¿Están entrando los webhooks? Si esto no crece, el canal está muerto.
SELECT provider, count(*), max(created_at) AS ultimo
FROM webhook_events GROUP BY provider ORDER BY 3 DESC;

-- ¿Quién crea las citas? Solo cuentan las de origen ia_*.
SELECT origen, estado, count(*) FROM citas GROUP BY 1, 2 ORDER BY 1;

-- Citas que no se sincronizaron con Google Calendar: hay que mirarlas a mano.
SELECT id, tipo_servicio, fecha_inicio, estado
FROM citas WHERE estado = 'sync_failed';

-- Jobs. 'cancelado' = no había nada que enviar (normal).
-- 'fallido' = se intentó 3 veces y no salió: eso sí hay que mirarlo.
SELECT tipo, estado, count(*), max(error) AS ultimo_error
FROM jobs GROUP BY 1, 2 ORDER BY 1, 2;

-- Escaladas que nadie ha atendido todavía.
SELECT id, canal, updated_at FROM conversaciones
WHERE estado = 'esperando_humano' ORDER BY updated_at;

-- El leader lock del scheduler. Con una sola réplica verás una fila por tarea.
SELECT name, holder, expires_at FROM scheduler_locks ORDER BY name;
```

---

## Nivel 4 — Regresión automática

Antes de cada despliegue:

```
cd backend  && python -m pytest -q          # 119 tests
cd dashboard && npx tsc --noEmit && npm run build
```

Los 12 tests de `test_canales_integracion.py` entran por HTTP con firma real por
cada canal. Son la red que no existía cuando el dedupe se rompió: se verificaron
reintroduciendo el bug a propósito y fallan 16.

El CI de GitHub Actions ya lo corre en cada push a `main` y `dev`.

---

## Qué NO se puede probar todavía

- **Email**: no hay envío de email en el backend. `notif_email` se guarda pero el
  único canal de aviso real es el webhook.
- **Widget web**: `/widget/[clinicId]` es una tarjeta con botones, no un chat.
  `POST /chat` funciona pero no lo consume nada.
- **Multisede / multiusuario**: un usuario, una clínica (constraint en la 019).

## Orden sugerido para la primera sesión

1. Seed + preflight en verde. *(10 min)*
2. Las 8 pruebas del nivel 1 en el chat del panel. *(30 min)*
3. WhatsApp real. *(10 min)*
4. Voz directa, sin desvío. *(10 min)*
5. Voz con desvío. *(10 min)*
6. Consultas del nivel 3 para confirmar que quedó rastro de todo. *(5 min)*
