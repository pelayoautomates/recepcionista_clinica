# Recepcionista IA para Clínicas — Documento de Contexto

> Lee este archivo antes de tocar cualquier código. Tiene todo lo que necesitas para entender el proyecto.

> Regla operativa del proyecto: al cerrar cada bloque de cambios, actualizar siempre `CONTEXTO.md` y `PROGRESO.md` (estado, decisiones, pendientes y checklist de despliegue).

---

## Qué es este producto

Plataforma SaaS de recepción virtual para clínicas. Atiende mediante **llamada telefónica** y **WhatsApp** en los horarios y modos activados por cada clínica. Ambos canales comparten el mismo agente de IA, la misma base de datos y el mismo contexto por paciente. La web pública incluye una demo, pero el producto no ofrece todavía un webchat embebible.

**Lo que hace:**
- Atiende y responde pacientes por voz y WhatsApp cuando el canal está correctamente activado
- Gestiona citas sobre Google Calendar real (crear, mover, cancelar)
- Guarda cada contacto como lead con estado en Supabase
- Transcribe audios de WhatsApp con Whisper
- Envía recordatorios automáticos antes de citas (24h y 1h)
- Permite seguimiento comercial solo con consentimiento explícito; permanece desactivado por defecto
- Escala a humano cuando detecta urgencia o complejidad

**Lo que NO hace:**
- No diagnostica ni recomienda medicamentos
- No da presupuestos cerrados
- No sustituye al equipo médico en ninguna decisión clínica

---

## Stack técnico

| Capa | Tecnología | Versión/Notas |
|---|---|---|
| Backend | FastAPI (Python) | Python 3.12, Railway |
| Base de datos | Supabase (PostgreSQL) | Proyecto: pccleqeuojcjflzagnhb |
| LLM | OpenAI GPT-4o | Function calling para tools; gpt-4o-mini para resúmenes diarios |
| Transcripción | Whisper (OpenAI API) | Para audios de WhatsApp |
| Chat web | Endpoint POST /chat | Widget embebible pendiente de construir |
| WhatsApp | Meta Cloud API directa | Webhook en /webhook/whatsapp |
| Voz | Retell AI | Custom LLM WebSocket en /retell/llm-websocket |
| Calendario | Google Calendar API (OAuth2) | Tokens cifrados con Fernet en Supabase |
| Scheduling | APScheduler 3.10.4 (BackgroundScheduler) | Corre dentro de FastAPI; jobs cada 1 min |
| Dashboard | Next.js 15 | App Router, Vercel |
| Auth dashboard | Supabase Auth + Google OAuth | Dos roles: agencia_admins y clinica_usuarios |

---

## URLs de producción

| Servicio | URL |
|---|---|
| Backend API | https://recepcionista-clinica-production.up.railway.app |
| Dashboard | https://recepcionista-clinica.vercel.app |
| Supabase | https://pccleqeuojcjflzagnhb.supabase.co |
| Health check | https://recepcionista-clinica-production.up.railway.app/health |

---

## Actualizaciones recientes (2026-05-07)

- Conversaciones del panel clínica ahora muestran solo mensajes legibles para recepción (sin `tool/system`, sin `null`, sin JSON técnico).
- El backend persiste historial conversacional limpio (`user`/`assistant`) para evitar ruido operativo en soporte manual.
- Configuración del agente rediseñada con foco en **Info extraída** editable; cada cambio regenera automáticamente el prompt técnico.
- El **System Prompt** queda en modo **Avanzado** para usuarios técnicos.
- Integraciones Google/WhatsApp usan iconografía de marca en el dashboard para mayor credibilidad visual.
- Fix de acceso CEO/agencia: middleware usa `AGENCY_EMAIL` (server) o `NEXT_PUBLIC_AGENCY_EMAIL` con fallback y soporte para varios emails separados por coma.
- Nueva landing comercial pública en `/landing` para captar clientes (sin tocar backend ni auth flow interno).
- La landing se rediseno con enfoque de conversion (claridad de propuesta, reduccion de friccion de decision, riesgo bajo y estructura de pricing orientada a accion).

---

## Actualizaciones recientes (2026-05-13) - Seguridad y robustez operativa

### Bloque 1 (completado)
- Seguridad admin fail-closed en produccion para `ADMIN_API_KEY` (sin clave, `/admin` responde error en prod).
- Endpoints sensibles protegidos con `require_admin_key`:
  - invitaciones backend
  - registro SaaS backend
  - checkout/portal de Stripe (webhook sigue validado por firma Stripe, sin admin key)
- OAuth Google endurecido con `state` firmado + nonce en cookie para mitigar CSRF/replay.
- Multi-tenant reforzado en `run_agent` y flujos de conversacion:
  - lookup de conversacion por `id + clinic_id`
  - updates de conversacion siempre filtrados por `clinic_id`
  - resolucion de paciente coherente (no crear lead anonimo prematuramente)
- Billing centralizado en `run_agent` (con `skip_billing=True` solo para test-chat admin).
- WhatsApp/voz ahora manejan `PlanInactivo` y `MinutosAgotados` con fallback controlado.
- Se elimino fallback inseguro de enrutado por "primera clinica" en Twilio/Meta.
- Webhook Twilio con verificacion de firma `X-Twilio-Signature`.

### Bloque 2 (completado)
- Retell WebSocket endurecido:
  - soporte de secreto dedicado `RETELL_WS_SECRET` (token por query/header)
  - validacion de coherencia `clinic_id <-> retell_agent_id` durante la llamada
- `retell_manager` propaga automaticamente token WS en `llm_websocket_url` al crear/actualizar agente.
- Dedupe persistente para webhooks (evita reprocesar retries/replays):
  - Retell
  - Meta WhatsApp
  - Twilio WhatsApp
  - 360dialog
- Nueva utilidad backend: `backend/webhook_dedupe.py`
- Nueva migracion SQL: `backend/database/migrations/013_webhook_events.sql`

### Bloque 3 (completado) - Optimizacion de listados y payload
- `backend/routers/admin.py`:
  - paginacion estandar (`limit`, `offset`) en listados de alto volumen:
    - `/leads`
    - `/conversaciones`
    - `/citas`
    - `/lista-espera`
    - `/recuperacion` (limit aplicado antes de scoring final)
  - `/conversaciones` ahora soporta:
    - `include_mensajes` (por defecto `false`) para evitar enviar historiales completos cuando no hacen falta
    - filtro `fecha=YYYY-MM-DD` sobre `updated_at` para vistas del dia
- Dashboard ajustado para pedir solo los datos necesarios:
  - `panel/page.tsx`: conversaciones del dia con `limit=60` y citas del dia con `limit=120`
  - `panel/conversaciones/page.tsx`: `limit=250`
  - `panel/leads/page.tsx`: `limit=300` en leads/lista-espera/recuperacion
  - `panel/citas/page.tsx`: `limit=250`
- Nueva migracion de indices de rendimiento:
  - `backend/database/migrations/014_performance_indexes.sql`
  - indices para consultas por `clinic_id + updated_at/created_at` en conversaciones, pacientes y lista de espera

### Bloque 4 (completado) - Sync Google Calendar bajo demanda en panel de citas
- Problema detectado: `dashboard/app/panel/citas/page.tsx` hacia `POST /admin/clinicas/{id}/citas/sync-gcal` en cada carga de pagina.
- Impacto: consumo innecesario de API de Google Calendar y mayor latencia de render inicial.
- Cambio aplicado:
  - se elimina la auto-sync por carga en `dashboard/app/panel/citas/page.tsx`
  - se mantiene la sync automatica por scheduler backend (cada 60 min)
  - se anade accion manual "Sincronizar ahora" en `dashboard/app/panel/citas/CitasClient.tsx`
  - el boton muestra estado (`Sincronizando...`) y resultado (`importadas/actualizadas`) y refresca la vista al terminar
- Resultado esperado: menor coste operativo y mejor tiempo de carga del panel de citas sin perder capacidad de sync inmediata cuando el usuario lo necesita.

### Bloque 5 (completado) - Correccion de rangos de fecha por zona horaria
- Problema detectado: varios endpoints filtraban "hoy" con `T00:00:00Z` / `T23:59:59Z`, lo que desplaza resultados para usuarios en `Europe/Madrid`.
- Riesgo: citas y conversaciones cercanas a medianoche podian aparecer en el dia equivocado; metricas diarias con conteos inconsistentes.
- Cambio aplicado en `backend/routers/admin.py`:
  - helper central `_utc_bounds_for_local_day(fecha_iso)` que convierte `YYYY-MM-DD` local (Madrid) a rango UTC `[inicio, fin_exclusivo)`
  - `listar_conversaciones(fecha=...)` ahora usa `gte(updated_at, inicio)` + `lt(updated_at, fin)`
  - `listar_citas(fecha=...)` ahora usa `gte(fecha_inicio, inicio)` + `lt(fecha_inicio, fin)`
  - `metricas_clinica` ahora calcula hoy/ayer en timezone Madrid y usa esos limites UTC coherentes
  - `leads_recuperacion` actualiza corte de ">3 dias" con el mismo criterio de dia local
- Resultado esperado: consistencia de datos diarios entre UI, metricas y operativa real de clinicas en Espana.

### Bloque 6 (completado) - Normalizacion de textos UI en panel de citas
- Problema detectado: `dashboard/app/panel/citas/CitasClient.tsx` tenia mojibake visual (`No asistiÃ³`, `Hoy â€”`, `TelÃ©fono`, etc.).
- Impacto: experiencia poco profesional en panel y mayor riesgo de errores de lectura por usuario final.
- Cambio aplicado:
  - se reescribe `CitasClient.tsx` en UTF-8 limpio
  - textos visibles normalizados a ASCII estable (`No asistio`, `Telefono`, `Duracion`, `Hoy - ...`)
  - se mantiene toda la funcionalidad ya implementada (sync manual GCal, cards, modal, refresco de datos)
- Resultado esperado: interfaz legible y consistente, sin caracteres corruptos en la vista de citas.

### Bloque 7 (completado) - Estados UX consistentes en accion de sync (citas)
- Mejora aplicada en `dashboard/app/panel/citas/CitasClient.tsx`:
  - estado explicito de resultado (`success` / `error`) para la sync manual de Google Calendar
  - feedback visual consistente:
    - error en rojo
    - exito en verde
  - accesibilidad: `aria-busy` en boton durante carga y `role=alert/status` en mensaje de resultado
- Resultado esperado: operativa mas clara para recepcion y menos ambiguedad cuando una sync falla o se completa.

### Bloque 8 (completado) - Estabilidad de panel leads/conversaciones + feedback unificado
- Problema detectado:
  - `LeadsWrapper` importaba componentes eliminados (`lista-espera` y `recuperacion`), dejando riesgo real de build roto.
  - feedback inconsistente en acciones clave de conversacion (resolver/responder).
- Cambios aplicados:
  - restaurados componentes:
    - `dashboard/app/panel/lista-espera/ListaEsperaClient.tsx`
    - `dashboard/app/panel/recuperacion/RecuperacionClient.tsx`
  - `dashboard/app/panel/conversaciones/[id]/ConversacionDetalle.tsx` refactorizado con:
    - estados `loading/success/error` para resolver y responder
    - avisos visuales semanticos
    - accesibilidad (`aria-busy`, `role=alert/status`)
  - normalizacion adicional de textos en:
    - `dashboard/app/panel/leads/LeadsClient.tsx`
    - `dashboard/app/panel/leads/LeadsWrapper.tsx`
- Resultado esperado: panel estable (sin imports rotos) y UX consistente en acciones operativas de recepcion.

### Bloque 9 (completado) - Feedback UX unificado en agenda (servicios/profesionales/salas/bloqueos)
- Mejoras aplicadas:
  - `dashboard/app/panel/agenda/ServiciosTab.tsx`
  - `dashboard/app/panel/agenda/ProfesionalesTab.tsx`
  - `dashboard/app/panel/agenda/SalasTab.tsx`
  - `dashboard/app/panel/agenda/BloquesTab.tsx`
- Cambios funcionales:
  - mensajes de estado consistentes (`success` / `error`) tras acciones mutables (guardar, activar/desactivar, eliminar)
  - avisos semanticos con `role=alert/status`
  - manejo de error explicito cuando una mutacion falla
- Resultado esperado: UX operativa consistente en configuracion de agenda y menos incertidumbre para el usuario al ejecutar cambios.

### Bloque 10 (completado) - Cobertura en subflujos de agenda (disponibilidad/asignacion/reglas)
- Mejoras aplicadas:
  - `dashboard/app/panel/agenda/ProfesionalesTab.tsx` (`DisponibilidadEditor`)
  - `dashboard/app/panel/agenda/ServiciosTab.tsx` (`ProfAsignados`)
  - `dashboard/app/panel/agenda/ReglasTab.tsx`
- Cambios funcionales:
  - validacion robusta de respuestas API (`res.ok`) en carga/guardado de disponibilidad y asignaciones.
  - manejo de errores explicito con `try/catch` en subflujos que antes podian fallar en silencio.
  - avisos semanticos `success/error` con `role=alert/status` en disponibilidad, asignacion y reglas.
  - `aria-busy` durante guardado en reglas para feedback de carga accesible.
- Resultado esperado: cobertura completa del patron UX de feedback en toda agenda, incluyendo subcomponentes internos.

### Bloque 11 (completado) - Correccion de feedback en canal de voz
- Mejora aplicada:
  - `dashboard/app/panel/canales/CanalesClient.tsx`
- Cambios funcionales:
  - `handleDesconectar` ahora valida `res.ok` antes de confirmar exito.
  - `voiceSuccess` pasa de booleano a mensaje para feedback mas preciso por accion.
  - limpieza de estados de feedback al iniciar nuevas acciones (conectar, desconectar, buscar, comprar).
  - mensajes de exito con `role=status` para accesibilidad.
- Resultado esperado: sin falsos positivos de desconexion y mejor trazabilidad de resultado en configuracion de voz.

### Bloque 12 (completado) - Saneado de textos mojibake en Configuracion y Canales
- Mejoras aplicadas:
  - `dashboard/app/panel/configuracion/ConfiguracionWrapper.tsx`
  - `dashboard/app/panel/canales/CanalesClient.tsx`
- Cambios funcionales:
  - limpieza de textos visibles con caracteres corruptos (mojibake).
  - restauracion de elementos UI que quedaron degradados en el saneado (labels/botones/simbolos de accion).
  - correccion de `value`/`onChange` en controles de formulario para evitar rotura funcional.
  - ambos archivos quedaron en ASCII limpio (sin null bytes ni caracteres de reemplazo).
- Resultado esperado: experiencia de usuario legible y estable en dos vistas operativas criticas del panel.

### Bloque 13 (completado) - Hotfix de compilacion en Configuracion
- Mejora aplicada:
  - `dashboard/app/panel/configuracion/ConfiguracionWrapper.tsx`
- Cambios funcionales:
  - correccion de token JSX invalido en el boton de envio del drawer de test.
  - sustitucion por texto estable (`Enviar`) para evitar error de parseo en build.
- Resultado esperado: compilacion de Next.js sin bloqueo en la linea reportada (`ConfiguracionWrapper.tsx:558`).

### Bloque 14 (completado) - Lint no interactivo para CI
- Mejoras aplicadas:
  - `dashboard/.eslintrc.json` (nuevo)
  - `dashboard/package.json`
- Cambios funcionales:
  - configuracion ESLint minima con `next/core-web-vitals`.
  - incorporadas dependencias `eslint` y `eslint-config-next` en `devDependencies`.
- Resultado esperado: `npm run lint` sin prompt interactivo y apto para ejecucion en CI.

### Bloque 15 (completado) - Correccion de errores ESLint bloqueantes
- Mejoras aplicadas:
  - `dashboard/app/panel/configuracion/TestAgente.tsx`
  - `dashboard/app/privacidad/page.tsx`
  - `dashboard/app/terminos/page.tsx`
- Cambios funcionales:
  - comillas escapadas en JSX para cumplir `react/no-unescaped-entities`.
  - enlaces internos migrados de `<a href=\"/...\">` a `Link` de Next.js para cumplir `@next/next/no-html-link-for-pages`.
- Resultado esperado: cierre de errores ESLint que estaban bloqueando tanto `lint` como `build`.

### Bloque 16 (completado) - Limpieza de warning hook en marketing
- Mejora aplicada:
  - `dashboard/components/marketing/AgentDemoSandbox.tsx`
- Cambios funcionales:
  - eliminado `useCallback` innecesario en `startListening` para evitar warning de dependencia faltante.
- Resultado esperado: reducir ruido en `lint/build` y dejar salida mas limpia para CI.

### Bloque 17 (completado) - Cierre de warning residual en hooks de marketing
- Mejora aplicada:
  - `dashboard/components/marketing/AgentDemoSandbox.tsx`
- Cambios funcionales:
  - `beginConnected` deja de usar `useCallback` y pasa a funcion normal.
  - con ello se elimina la dependencia inestable de `startListening` que seguia disparando `react-hooks/exhaustive-deps`.
- Resultado esperado: `lint/build` sin warnings de hooks en `AgentDemoSandbox.tsx`.

### Checklist obligatorio de despliegue (si no se hace, el bloque 2 queda incompleto)
1. Ejecutar migracion `013_webhook_events.sql`.
2. Configurar `RETELL_WS_SECRET` en entorno de produccion (backend).
3. Reprovisionar o actualizar agentes Retell para refrescar `llm_websocket_url` con token.
4. Verificar webhooks con retries reales (Twilio/Meta/Retell) y confirmar que no se duplica procesamiento.

### Checklist adicional de despliegue (bloque 3)
1. Ejecutar migracion `014_performance_indexes.sql`.
2. Verificar tiempos de respuesta de:
  - `/admin/clinicas/{id}/conversaciones`
  - `/admin/clinicas/{id}/leads`
  - `/admin/clinicas/{id}/citas`
3. Si se necesita historico completo en UI concreta, usar `include_mensajes=true` solo en esa vista puntual.

### Estado de validacion
- En este entorno local no se pudieron ejecutar tests de Python porque no hay runtime Python instalado/configurado.
- En este entorno local no se pudo ejecutar build/lint de Next.js porque `npm` no esta disponible.
- Los cambios quedaron aplicados en codigo y listos para validacion en CI/entorno con Python.

---

## Estructura de archivos real

```
Recepcionista Clinicas/
├── CONTEXTO.md          ← Estás aquí
├── PROGRESO.md          ← Estado actual de implementación
│
├── backend/
│   ├── main.py          ← Entry point FastAPI con lifespan (inicia scheduler)
│   ├── requirements.txt ← Dependencias Python (fastapi, supabase, openai, google-auth, etc.)
│   ├── config.py        ← Settings con Pydantic BaseSettings; lee .env desde backend/ y raíz
│   ├── database/
│   │   ├── client.py                    ← Supabase singleton (service role key)
│   │   └── migrations/
│   │       ├── 001_schema.sql           ← 5 tablas principales + RLS + índices
│   │       └── 002_auth.sql             ← agencia_admins, clinica_usuarios, invitaciones
│   ├── models/
│   │   ├── clinica.py                   ← ClinicaCreate, ClinicaUpdate
│   │   └── conversacion.py              ← ChatRequest
│   ├── tools/
│   │   ├── calendario.py                ← consultar_disponibilidad, crear_cita, mover_cita, cancelar_cita
│   │   ├── pacientes.py                 ← buscar_paciente, crear_lead (con fusión), actualizar_estado_lead
│   │   └── sistema.py                   ← programar_seguimiento, escalar_a_humano
│   ├── agent/
│   │   ├── core.py                      ← Loop de function calling GPT-4o (max 10 iter); guarda historial
│   │   ├── tool_definitions.py          ← 9 JSON schemas para OpenAI function calling
│   │   └── prompts.py                   ← build_system_prompt(); agente se llama "Valeria"
│   ├── google_calendar/
│   │   ├── auth.py                      ← OAuth2 flow, Fernet encrypt/decrypt, get_credentials
│   │   └── client.py                    ← listar_slots_libres, crear_evento, mover_evento, cancelar_evento
│   ├── jobs/
│   │   └── scheduler.py                 ← APScheduler; procesa jobs cada 1 min; programa recordatorios cada 1h
│   └── routers/
│       ├── admin.py                     ← CRUD clínicas, leads, conversaciones, citas, jobs, métricas
│       ├── auth.py                      ← GET /auth/google/{clinic_id} y GET /auth/google/callback
│       ├── chat.py                      ← POST /chat (chat web)
│       ├── invitaciones.py              ← POST invitación, POST vincular, GET /admin/me/rol
│       ├── whatsapp.py                  ← GET/POST /webhook/whatsapp (Meta Cloud API)
│       └── retell.py                    ← WS /retell/llm-websocket + POST /retell/webhook
│
└── dashboard/           ← Next.js 15 (App Router)
    ├── .env.local       ← Variables de entorno del dashboard
    ├── middleware.ts     ← Protección de rutas por email de agencia
    ├── components/
    │   ├── ConditionalNav.tsx           ← Nav azul marino (agencia); oculta en /login, /auth, /panel
    │   ├── PanelNavLinks.tsx            ← Navegación superior del panel clínica (estados activos)
    │   └── BrandLogos.tsx               ← Iconos de marca Google Calendar / WhatsApp
    ├── app/
    │   ├── layout.tsx                   ← RootLayout con ConditionalNav
    │   ├── landing/page.tsx             ← Landing comercial pública de Atiende360 (pricing + FAQ + CTA)
    │   ├── page.tsx                     ← / — Listado de clínicas con métricas (solo agencia)
    │   ├── login/
    │   │   └── page.tsx                 ← Login con Google; guarda token invitación en localStorage
    │   ├── auth/
    │   │   ├── callback/route.ts        ← Intercambia code, redirige por rol (agencia/clinica/completing)
    │   │   └── completing/page.tsx      ← Client component; lee localStorage y vincula invitación al usuario
    │   ├── panel/
    │   │   ├── layout.tsx               ← Nav clínica minimalista; verifica rol=clinica
    │   │   ├── page.tsx                 ← Dashboard de clínica: métricas + GCal + accesos rápidos
    │   │   ├── conversaciones/[id]/ConversacionDetalle.tsx ← Vista chat legible para recepción
    │   │   └── configuracion/ConfiguracionForm.tsx         ← Info extraída editable + prompt avanzado
    │   └── clinicas/
    │       └── [id]/
    │           ├── page.tsx             ← Detalle de clínica: métricas, GCal, WhatsApp, servicios, horarios
    │           ├── InvitacionButton.tsx ← Genera link de invitación con token one-time
    │           ├── GoogleCalendarButton.tsx
    │           └── EditClinicaForm.tsx
```

---

## Multi-tenancy

- Cada clínica tiene su `clinic_id` (UUID) en Supabase
- **RLS** activo en tablas de datos (pacientes, citas, conversaciones, jobs)
- El backend usa **service role key** → bypass RLS
- El dashboard usa **anon key** → RLS activo
- Los tokens de Google Calendar están cifrados con Fernet por clínica
- El agente recibe un system prompt personalizado por clínica (`prompt_personalizado`)

---

## Modelo de datos

```
clinicas (1) ──< pacientes (1) ──< citas
                     │
                     └──< conversaciones
                     └──< jobs

agencia_admins (roles)
clinica_usuarios (user_id ↔ clinic_id)
invitaciones (token one-time → clinic_id)
```

**Estados de lead:**
`anonimo` → `nuevo` → `contactado` → `interesado` → `cita_agendada` → `completado` / `perdido` / `requiere_humano`

**Estados de conversación:** `activa` / `esperando_humano` / `resuelta`

**Estados de cita:** `confirmada` / `cancelada` / `completada` / `no_asistio`

**Tipos de job:** `recordatorio_24h` / `recordatorio_1h` / `seguimiento_lead` / `resumen_diario`

---

## Sistema de autenticación (dos paneles)

### Roles
- **agencia_admins**: tú (`pelayo.automates@gmail.com`). Accede a `/` y `/clinicas/*`
- **clinica_usuarios**: clientes (clínicas). Acceden solo a `/panel/*`

### Flujo de invitación de clínica nueva
1. En `/clinicas/{id}` (panel agencia), click en "Generar link de acceso" → llama a `POST /admin/clinicas/{id}/invitacion` → genera token urlsafe(32) → guarda en tabla `invitaciones`
2. El link generado es: `https://recepcionista-clinica.vercel.app/login?token=<TOKEN>`
3. Cliente abre el link → `/login` detecta `?token` → lo guarda en `localStorage` como `pending_invite`
4. Cliente hace click en "Entrar con Google" → Supabase OAuth con Google → redirige a `/auth/callback`
5. `/auth/callback` intercambia el code, detecta que el email no es de agencia y no está vinculado → redirige a `/auth/completing`
6. `/auth/completing` (client component) lee `localStorage`, llama a `POST /admin/invitaciones/vincular` → borra el token del `localStorage` → redirige a `/panel`
7. Una vez vinculado, futuros logins del mismo usuario van directamente a `/panel`

### Protección de rutas (middleware.ts)
- Sin sesión → `/login`
- Rutas agencia (`/` y `/clinicas/*`) + email distinto al de agencia → redirige a `/panel`
- Rutas clínica (`/panel/*`) + email de agencia → redirige a `/`
- `/login` y `/auth/*` son rutas públicas

### Identificación de rol
- El middleware solo protege por email de agencia
- Los layouts de `/panel` llaman a `GET /admin/me/rol?user_id=...&email=...` para obtener el `clinic_id` del usuario

---

## Cómo funciona el agente

1. Llega mensaje (por cualquier canal: chat web, WhatsApp, voz)
2. Se carga la configuración de la clínica desde Supabase
3. Se carga o crea la conversación (historial de mensajes)
4. Si la conversación está en `esperando_humano` → se devuelve mensaje fijo sin llamar a GPT
5. Se construye el system prompt con datos de la clínica (nombre, horarios, servicios, prompt personalizado)
6. Se llama a GPT-4o con el historial + herramientas
7. Si GPT-4o llama a una tool → se ejecuta → resultado → se vuelve a llamar GPT-4o (máx 10 iter)
8. Se guarda historial actualizado en Supabase (sin system prompt ni mensajes técnicos de tool calling)
9. Se devuelve la respuesta al canal correspondiente

El agente se llama **Valeria** y nunca toca directamente la base de datos ni el calendario.

---

## Tools disponibles del agente

| Tool | Descripción |
|---|---|
| `consultar_disponibilidad` | Slots libres en Google Calendar según horario de la clínica |
| `crear_cita` | Crea evento en GCal + registro en Supabase + actualiza lead a cita_agendada |
| `mover_cita` | Mueve evento en GCal + actualiza Supabase (mantiene duración original) |
| `cancelar_cita` | Cancela en GCal + marca estado cancelada en Supabase |
| `buscar_paciente` | Busca por teléfono en Supabase (para evitar duplicados) |
| `crear_lead` | Crea o fusiona paciente (si ya existe el teléfono, actualiza datos faltantes) |
| `actualizar_estado_lead` | Actualiza estado del funnel |
| `programar_seguimiento` | Crea job de seguimiento con idempotency_key |
| `escalar_a_humano` | Cambia estado conversación a esperando_humano + estado lead a requiere_humano |

---

## Scheduler (APScheduler)

Arranca con la aplicación (lifespan de FastAPI). Dos jobs recurrentes:

- **Cada 1 minuto:** `_procesar_jobs_pendientes` — ejecuta jobs vencidos de la tabla `jobs`. Reintentos con backoff (5 min * intento); máx 3 intentos, luego marca `fallido`.
- **Cada 1 hora:** `_programar_recordatorios_pendientes` — busca citas en las próximas 25h sin recordatorio y crea jobs de `recordatorio_24h` y `recordatorio_1h` con idempotency.

Los jobs de recordatorio/seguimiento envían mensajes por WhatsApp (Meta API). El `resumen_diario` genera el texto con GPT-4o-mini y solo lo loguea (TODO: enviar por email o Telegram).

---

## Variables de entorno

### Backend (`backend/.env`)

```env
# Supabase
SUPABASE_URL=https://pccleqeuojcjflzagnhb.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
SUPABASE_ANON_KEY=<anon_key>

# OpenAI
OPENAI_API_KEY=<key>

# Google Calendar OAuth2
GOOGLE_CLIENT_ID=<client_id>
GOOGLE_CLIENT_SECRET=<client_secret>
GOOGLE_REDIRECT_URI=https://recepcionista-clinica-production.up.railway.app/auth/google/callback

# Cifrado tokens OAuth (generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
FERNET_KEY=<key>

# WhatsApp Meta Cloud API (opcional hasta conectar)
META_VERIFY_TOKEN=token_provisional
META_ACCESS_TOKEN=<token>
META_PHONE_NUMBER_ID=<phone_number_id>

# Retell (voz)
RETELL_API_KEY=<key>
RETELL_AGENT_ID=<agent_id>

# App
BASE_URL=https://recepcionista-clinica-production.up.railway.app
ENVIRONMENT=production
```

### Dashboard (`dashboard/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://pccleqeuojcjflzagnhb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_BACKEND_URL=https://recepcionista-clinica-production.up.railway.app
BACKEND_URL=https://recepcionista-clinica-production.up.railway.app
AGENCY_EMAIL=pelayo.automates@gmail.com
NEXT_PUBLIC_AGENCY_EMAIL=pelayo.automates@gmail.com
NEXT_PUBLIC_SITE_URL=https://recepcionista-clinica.vercel.app
```

> Nota: `BACKEND_URL` (sin `NEXT_PUBLIC_`) se usa en Server Components para llamadas server-side. `NEXT_PUBLIC_BACKEND_URL` se usa en Client Components. Para permisos de agencia en middleware, usar preferentemente `AGENCY_EMAIL` (admite lista separada por comas). En `.env.local` local, `NEXT_PUBLIC_SITE_URL` debe ser `http://localhost:3000`.

### Rutas públicas actuales

- `/login`
- `/auth/*`
- `/landing`

---

## Bugs conocidos pendientes

### Bug 1: Google Calendar OAuth falla al guardar tokens
- **Síntoma:** Al completar el flujo OAuth de Google, el callback devuelve `{"detail": "Error guardando tokens: ..."}` en lugar de la página de éxito.
- **Causa probable:** `GOOGLE_REDIRECT_URI` en Railway o en la Google Cloud Console no coincide exactamente con la URL real del callback (`https://recepcionista-clinica-production.up.railway.app/auth/google/callback`).
- **Cómo diagnosticar:** Revisar los logs de Railway en el endpoint `/auth/google/callback` y comparar el redirect_uri configurado con el que llega en la petición OAuth de Google.
- **Archivos relevantes:** `backend/routers/auth.py`, `backend/google_calendar/auth.py`, `backend/config.py`

### Bug 2: Conflicto de rutas /auth/google/callback vs /auth/google/{clinic_id}
- **Síntoma:** Al visitar `/auth/google/callback`, FastAPI intentaba parsear "callback" como UUID en la ruta `/{clinic_id}`, lanzando error de validación.
- **Estado:** Corregido en código — `GET /auth/google/callback` está registrado antes que `GET /auth/google/{clinic_id}` en `routers/auth.py`. Pendiente de confirmar deploy en Railway.
- **Archivos relevantes:** `backend/routers/auth.py`

---

## Cómo correr en local

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Crear backend/.env con las variables de arriba
uvicorn main:app --reload --port 8000
```

```bash
# Dashboard
cd dashboard
npm install
# .env.local ya existe (ajustar NEXT_PUBLIC_SITE_URL a http://localhost:3000 si no lo está)
npm run dev                    # http://localhost:3000
```

**Para añadir tu usuario como admin de agencia en Supabase:**
```sql
INSERT INTO agencia_admins (user_id, email)
VALUES ('<tu_user_id_de_supabase_auth>', 'pelayo.automates@gmail.com');
```

---

## Convenciones de código

- **Async por defecto** en todos los routers y funciones de I/O
- **clinic_id** siempre como primer parámetro en tools y funciones de DB
- **Pydantic** para validar inputs y outputs de todos los endpoints
- **Logs** con `logging` estándar de Python, nivel INFO en producción
- **Idempotency keys** en todos los jobs: `f"{tipo}_{cita_id}"` (recordatorios) o `f"seguimiento_lead_{paciente_id}_{fecha.date()}"` (seguimientos)
- Los tokens OAuth **nunca** se devuelven en responses de API (solo se devuelve `bool` indicando si existen)
- El backend usa **service role key** de Supabase para bypassear RLS

---

## Fases del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Núcleo + panel interno + auth con roles | Ver PROGRESO.md |
| 2 | Chat web embebible + web demo | Ver PROGRESO.md |
| 3 | Voz (Retell AI) | Ver PROGRESO.md |
| 4 | WhatsApp (Meta Cloud API) | Ver PROGRESO.md |
| 5 | Automatizaciones (jobs) | Ver PROGRESO.md |
| 6 | Activación Express + dashboard cliente | Ver PROGRESO.md |

Ver [PROGRESO.md](PROGRESO.md) para el estado detallado actual.
