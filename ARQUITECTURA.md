# Arquitectura — Recepcionista IA para Clínicas (Atiende360)

> Última actualización: 2026-05-20 (noche)
> Estado: Beta activa. Migración WhatsApp en curso (ver sección Progreso).

---

## Stack tecnológico

| Capa | Tecnología | URL producción |
|---|---|---|
| Backend | FastAPI (Python 3.12) | `https://recepcionista-clinica-production.up.railway.app` |
| Base de datos | Supabase (PostgreSQL) | Proyecto Supabase vinculado |
| LLM | OpenAI GPT-4o (function calling) | — |
| Voz | Retell AI (WebSocket Custom LLM) | — |
| Teléfono | Telnyx (compra/gestión de números) | — |
| WhatsApp | Meta Cloud API (Embedded Signup por clínica) | — |
| Dashboard | Next.js 15 App Router | `https://recepcionista-clinica.vercel.app` |
| Dominio | atiende360.com (apunta a Vercel) | — |
| Deploy backend | Railway (auto-deploy desde GitHub `main`, carpeta `backend`) | — |
| Pagos | Stripe | — |

---

## Dos paneles / dos roles

| Panel | Color nav | Acceso | Rutas |
|---|---|---|---|
| Agencia (Pelayo) | Azul marino `#1a1a2e` | Admin global | `/`, `/clinicas/*` |
| Clínica | Verde `#166634` | Solo su clínica | `/panel/*` |

Auth: Supabase Auth + Google OAuth. Middleware redirige según rol (`agencia_admins` vs `clinica_usuarios`).

---

## Flujo de conversación (cualquier canal)

```
PACIENTE
   │
   ├── Chat Web ─────────────────────────────────────┐
   ├── WhatsApp (Meta Cloud API, Embedded Signup) ───┤
   └── Llamada (Retell AI + Telnyx) ─────────────────┤
                                                      │
                                                      ▼
                                              FastAPI (Railway)
                                                      │
                                              Agent Core (GPT-4o)
                                                      │
                          ┌───────────────────────────┼──────────────────────────┐
                          │                           │                          │
                   Google Calendar              Supabase (PostgreSQL)     Notificación
                   API (citas)                  (historial, leads)        a clínica (handoff)
```

---

## Flujo detallado — Function Calling con GPT-4o

```
1. Mensaje entra → router (chat / whatsapp / retell)
2. Router → agent/core.py → run_agent(clinic_id, conversacion_id, mensaje)
3. Carga historial desde Supabase (tabla conversaciones)
4. OpenAI API call: gpt-4o con tools definidos
5. ¿Tiene tool_calls?
   ├── NO → Responde al canal. Guarda en historial. FIN.
   └── SÍ → Ejecuta tools:
              ├── consultar_disponibilidad → Google Calendar
              ├── crear_cita / mover_cita / cancelar_cita → GCal + Supabase
              ├── buscar_paciente / crear_lead / actualizar_estado_lead → Supabase
              ├── programar_seguimiento → Supabase jobs
              └── escalar_a_humano → Supabase + webhook notificación
              └── Añade resultados → vuelve al paso 4 (loop)
```

---

## Canales disponibles

### 1. WhatsApp (principal — Meta Embedded Signup)
- La clínica conecta su número desde el panel: `/panel/canales` → "Conectar WhatsApp"
- Se abre popup oficial de Meta (Facebook Login for Business)
- El backend intercambia el auth code por un System User access token
- Token cifrado con Fernet, almacenado en `clinicas.meta_access_token`
- Webhook: `POST /webhook/whatsapp` → enruta por `meta_phone_number_id`
- Meta App ID: `2046082839672432` (Atiende360, tipo Business)
- Requires App Review de Meta para producción completa (en proceso)

### 2. Voz (Telnyx + Retell AI)
- La clínica compra un número Telnyx desde el panel
- Número se importa en Retell AI y se asigna al agente de la clínica
- Retell llama al WebSocket `/retell/llm-websocket` para cada llamada
- Cada clínica puede tener su `retell_agent_id` propio

### 3. SMS (Telnyx, recordatorios automáticos)
- Mismo número Telnyx que voz
- APScheduler envía recordatorios 24h y 1h antes de cada cita
- El seguimiento comercial permanece desactivado salvo consentimiento explícito y lista de supresión.

### 4. Demo web y acceso por canales
- Endpoint interno de conversación: `POST /chat`.
- La ruta `/widget/[clinicId]` es hoy un selector de teléfono/WhatsApp, no un chat embebible.
- Un webchat real requiere cliente conversacional, consentimiento, aislamiento tenant y política de `frame-ancestors`; queda fuera del piloto.

---

## Modelo de datos (tabla clinicas — columnas principales)

```
clinicas
├── id UUID PK
├── nombre TEXT
├── telefono TEXT                    ← teléfono de contacto (display)
├── email_contacto TEXT
├── horarios JSONB                   ← { "lun": {"start":"09:00","end":"20:00"}, ... }
├── servicios JSONB                  ← [{ "nombre":"Limpieza","duracion_min":60 }]
├── prompt_personalizado TEXT
│
├── ── Google Calendar ──
├── google_tokens_enc TEXT           ← OAuth tokens cifrados con Fernet
│
├── ── WhatsApp (Meta Embedded Signup) ──
├── meta_waba_id TEXT                ← WhatsApp Business Account ID
├── meta_phone_number_id TEXT        ← Phone Number ID (enrutar webhooks)
├── meta_phone_number TEXT           ← Número display (+34 91X XXX XXX)
├── meta_access_token TEXT           ← System User token cifrado con Fernet
│
├── ── WhatsApp legacy (deprecado) ──
├── whatsapp_number TEXT             ← phone_number_id global (legacy Meta direct)
├── twilio_whatsapp_number TEXT      ← número Twilio (pendiente eliminar)
│
├── ── Voz ──
├── telefono_ia TEXT                 ← número Telnyx comprado para la IA
├── telnyx_number_id TEXT            ← ID interno Telnyx del número
├── retell_agent_id TEXT             ← agente Retell propio (fallback al global)
│
├── ── Config ──
├── routing_mode TEXT                ← 'siempre' | 'fuera_horario' | 'si_no_contestan'
├── notification_email TEXT          ← email para handoffs a humano
├── notif_webhook TEXT               ← webhook para notificaciones (Slack, Make, etc.)
│
├── ── Facturación ──
├── stripe_customer_id TEXT
├── stripe_subscription_id TEXT
├── plan TEXT                        ← 'starter' | 'pro' | 'growth'
├── minutos_usados INT
├── minutos_limite INT
└── created_at TIMESTAMPTZ
```

---

## Otras tablas

```
pacientes       ← un registro por persona real, multi-canal
citas           ← vinculadas a Google Calendar (google_event_id)
conversaciones  ← historial de mensajes por sesión (JSONB)
jobs            ← recordatorios y seguimientos programados (APScheduler)
webhook_events  ← deduplicación de webhooks entrantes
audit_log       ← log de cambios importantes
conocimiento    ← base de conocimiento por clínica (RAG futuro)
```

---

## Seguridad

- Endpoints `/admin/*` protegidos con `X-Admin-Key` (env `ADMIN_SECRET`)
- `adminFetch()` en Next.js inyecta la key automáticamente (server-side only)
- CORS: lista explícita en `ALLOWED_ORIGINS`
- Webhooks Meta: validación firma `X-Hub-Signature-256` (HMAC-SHA256)
- Retell: validación firma HMAC-SHA256
- Tokens OAuth Google y Meta: cifrados con Fernet antes de guardar en DB
- RLS en Supabase activo en todas las tablas

---

## Endpoints backend principales

```
POST /chat                              ← Chat web (widget)
GET  /webhook/whatsapp                  ← Verificación webhook Meta
POST /webhook/whatsapp                  ← Mensajes WhatsApp (Meta + legacy)
POST /webhook/whatsapp/twilio           ← Legacy Twilio (deprecado)
WS   /retell/llm-websocket              ← Custom LLM para Retell
POST /retell/webhook                    ← Eventos Retell (fin de llamada, etc.)

GET  /admin/clinicas                    ← Lista clínicas
GET  /admin/clinicas/{id}/leads
GET  /admin/clinicas/{id}/conversaciones
GET  /admin/clinicas/{id}/citas
GET  /admin/clinicas/{id}/canales       ← Estado canales (WhatsApp, voz, SMS, GCal)
POST /admin/clinicas/{id}/canales/whatsapp/meta   ← Conectar WhatsApp (Embedded Signup)
DELETE /admin/clinicas/{id}/canales/whatsapp/meta ← Desconectar WhatsApp
POST /admin/clinicas/{id}/canales/voz/comprar      ← Comprar número Telnyx
DELETE /admin/clinicas/{id}/canales/voz            ← Desconectar número voz

GET  /auth/google/{clinic_id}           ← Inicia OAuth Google Calendar
GET  /auth/google/callback              ← Callback OAuth Google

POST /billing/checkout                  ← Crear sesión Stripe
POST /billing/webhook                   ← Webhook Stripe (pagos, cambios plan)

POST /saas/registro                     ← Registro nueva clínica
```

---

## Rutas frontend (Next.js)

```
/                          ← Panel agencia (métricas globales)
/clinicas/{id}             ← Detalle clínica (agencia)
/panel                     ← Dashboard clínica (métricas)
/panel/agenda              ← Configuración agenda IA (servicios, profesionales, salas)
/panel/configuracion       ← Config bot IA (info clínica, system prompt)
/panel/canales             ← Canales: WhatsApp, voz, SMS, webchat
/panel/calendario          ← Vista calendario con citas
/landing                   ← Landing pública de Atiende360
```

---

## Variables de entorno (Railway — backend)

```
SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
OPENAI_API_KEY
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
FERNET_KEY
META_APP_ID                    ← 2046082839672432
META_APP_SECRET                ← App Secret de la Meta App
META_VERIFY_TOKEN              ← atiende360_whatsapp_verify_2026
META_GRAPH_VERSION             ← v21.0 (default)
META_ACCESS_TOKEN              ← token global legacy (deprecado)
META_PHONE_NUMBER_ID           ← phone_number_id global legacy (deprecado)
RETELL_API_KEY, RETELL_AGENT_ID, RETELL_WS_SECRET
TELNYX_API_KEY, TELNYX_SIP_CONNECTION_ID, TELNYX_SIP_SUBDOMAIN, TELNYX_SMS_NUMBER
ADMIN_SECRET
ALLOWED_ORIGINS
BASE_URL
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_GROWTH
DASHBOARD_URL                  ← https://atiende360.com
ENVIRONMENT                    ← production
```

## Variables de entorno (Vercel — frontend)

```
NEXT_PUBLIC_META_APP_ID           ← 2046082839672432
NEXT_PUBLIC_META_CONFIGURATION_ID ← Configuration ID de Facebook Login for Business
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ADMIN_SECRET                       ← mismo que Railway (server-side only)
BACKEND_URL                        ← URL Railway
```

---

## Migraciones SQL aplicadas

| Fichero | Contenido |
|---|---|
| 001_schema | Tablas base: clinicas, pacientes, citas, conversaciones, jobs |
| 002_auth | Auth: agencia_admins, clinica_usuarios, invitaciones |
| 003_trial | Campos trial: trial_ends_at, plan |
| 004_calendar | Google Calendar: tokens OAuth |
| 005_scheduling | Agenda IA: servicios, profesionales, salas, disponibilidad, reglas |
| 006_rls_and_webhook | RLS policies + notif_webhook |
| 007_rls_policies | RLS adicional |
| 008_audit_log | Tabla audit_log |
| 009_conocimiento | Tabla conocimiento (RAG futuro) |
| 010_bloque6 | Campos adicionales clínica (Bloque 6) |
| 011_retell_dialog360 | retell_agent_id + columnas 360dialog (obsoletas en 016) |
| 012_routing_notif_twilio | routing_mode, notification_email, twilio_whatsapp_number |
| 013_webhook_events | Tabla webhook_events (deduplicación) |
| 014_performance_indexes | Índices de rendimiento |
| 015_increment_minutos_fn | Función SQL para incrementar minutos usados |
| 016_meta_embedded_signup | Meta Embedded Signup + DROP columnas 360dialog |

---

## Progreso y estado actual

### Funcionalidades completadas
- [x] Agent Core GPT-4o con function calling
- [x] Chat web (widget)
- [x] WhatsApp via Meta Cloud API (legacy global)
- [x] **WhatsApp via Meta Embedded Signup (por clínica, sin fricción)** ← NUEVO
- [x] Voz (Retell AI + Telnyx): compra número desde panel
- [x] SMS recordatorios automáticos (APScheduler)
- [x] Google Calendar OAuth (conexión desde panel)
- [x] Agenda IA: servicios, profesionales, salas, reglas
- [x] Dashboard clínica: métricas, conversaciones, calendario
- [x] Panel agencia: gestión multi-clínica
- [x] Auth Supabase + Google OAuth + invitaciones
- [x] Multi-tenancy con RLS
- [x] Stripe: planes, checkout, webhook
- [x] Registro de nuevas clínicas (`/saas/registro`)
- [x] Landing pública

### Pendiente / En proceso
- [ ] Meta App Review (necesaria para producción de Embedded Signup con clínicas reales)
- [ ] Business Verification de Atiende360 en Meta Business Manager
- [x] Añadir variables de entorno META_APP_ID y NEXT_PUBLIC_META_CONFIGURATION_ID
- [x] Ejecutar migración 016 en Supabase
- [x] Meta App en modo Live (activado 2026-05-20)
- [ ] Test end-to-end WhatsApp con número Telnyx real (número comprado, pendiente conectar via Embedded Signup)
- [ ] Widget chat web embebible (en desarrollo)
- [ ] Eliminar código 360dialog (dialog360.py, routers/canales 360dialog endpoints) cuando todas las clínicas estén migradas
- [ ] Eliminar columna twilio_whatsapp_number cuando se confirme sin clínicas activas en Twilio

### Deuda técnica conocida
- Columnas legacy en clinicas: `whatsapp_number`, `twilio_whatsapp_number` (deprecadas, pendiente eliminar)
- Archivos obsoletos pendientes borrar: `backend/dialog360.py`, `backend/twilio_wa.py`
- Endpoints 360dialog en `routers/canales.py` pendientes eliminar
- Meta Access Token global (`META_ACCESS_TOKEN`) solo necesario como fallback legacy

---

## Diagrama de despliegue

```
Internet
   │
   ├── Paciente escribe WhatsApp ──► Meta Cloud API ──► POST /webhook/whatsapp
   ├── Paciente llama ─────────────► Retell AI ────────► WS /retell/llm-websocket
   ├── Paciente abre chat web ─────► Widget ────────────► POST /chat
   │
   ├── Clínica abre dashboard ─────► Vercel (Next.js)
   │       └── Conectar WhatsApp ──► Popup Meta (Embedded Signup)
   │                                       └── POST /admin/.../canales/whatsapp/meta
   │
   └── Agencia abre dashboard ─────► Vercel (Next.js)
   
   Railway (FastAPI)
        ├── Supabase (PostgreSQL)
        ├── OpenAI (GPT-4o)
        ├── Google Calendar API
        ├── Meta Graph API
        ├── Retell AI API
        ├── Telnyx API
        └── Stripe API
```
