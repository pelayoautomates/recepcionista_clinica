# Recepcionista IA para Clínicas — Documento de Contexto

> Lee este archivo antes de tocar cualquier código. Tiene todo lo que necesitas para entender el proyecto.

---

## Qué es este producto

Plataforma SaaS de recepción virtual para clínicas. Opera 24/7 atendiendo pacientes por **chat web**, **llamada telefónica** y **WhatsApp**. Los tres canales comparten el mismo agente de IA, la misma base de datos y el mismo contexto por paciente.

**Lo que hace:**
- Atiende y responde pacientes por los tres canales 24/7
- Gestiona citas sobre Google Calendar real (crear, mover, cancelar)
- Guarda cada contacto como lead con estado en Supabase
- Transcribe audios de WhatsApp con Whisper
- Envía recordatorios automáticos antes de citas (24h y 1h)
- Hace seguimiento de leads fríos
- Escala a humano cuando detecta urgencia o complejidad
- Genera resúmenes diarios por clínica

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
