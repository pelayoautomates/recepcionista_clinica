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
- Envía recordatorios automáticos antes de citas
- Hace seguimiento de leads fríos
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
| Base de datos | Supabase (PostgreSQL) | RLS activo en todas las tablas multi-tenant |
| LLM | OpenAI GPT-4o | Function calling para tools |
| Transcripción | Whisper (OpenAI API) | Para audios de WhatsApp |
| Chat web | Widget React embebible | Bundle standalone, sin dependencias |
| WhatsApp | Meta Cloud API directa | Número nuevo controlado por agencia |
| Voz | Vapi.ai | Server URLs apuntando a nuestro backend |
| Calendario | Google Calendar API (OAuth2) | Tokens cifrados con Fernet en Supabase |
| Scheduling | APScheduler (MVP) | Corre dentro de FastAPI en MVP |
| Dashboard | Next.js 14 | App Router, Vercel |

---

## Estructura del proyecto

```
Recepcionista Clinicas/
├── CONTEXTO.md          ← Estás aquí
├── PROGRESO.md          ← Estado actual de implementación
├── ARQUITECTURA.md      ← Diagramas de flujo y modelo de datos
│
├── backend/
│   ├── main.py          ← Entry point FastAPI
│   ├── requirements.txt
│   ├── .env.example
│   ├── config.py        ← Settings (Pydantic BaseSettings)
│   ├── database/
│   │   ├── client.py    ← Supabase singleton
│   │   └── migrations/
│   │       └── 001_schema.sql
│   ├── models/          ← Pydantic models
│   ├── tools/           ← Funciones que ejecuta el agente
│   │   ├── calendario.py
│   │   ├── pacientes.py
│   │   └── sistema.py
│   ├── agent/
│   │   ├── core.py             ← Loop de function calling
│   │   ├── tool_definitions.py ← JSON schemas para OpenAI
│   │   └── prompts.py          ← System prompts
│   ├── google_calendar/
│   │   ├── auth.py      ← OAuth2 flow
│   │   └── client.py    ← Wrapper de GCal API
│   ├── jobs/
│   │   └── scheduler.py ← APScheduler
│   └── routers/
│       ├── chat.py
│       ├── whatsapp.py
│       ├── vapi.py
│       └── admin.py
│
├── dashboard/           ← Next.js 14
└── widget/              ← Chat embebible (React)
```

---

## Multi-tenancy

- Cada clínica tiene su `clinic_id` (UUID) en Supabase
- **RLS** (Row Level Security) activo en todas las tablas de datos
- El backend siempre pasa `clinic_id` en cada operación
- Los tokens de Google Calendar están cifrados por clínica con Fernet
- El agente recibe un system prompt personalizado por clínica

---

## Modelo de datos resumido

```
clinicas (1) ──< pacientes (1) ──< citas
                     │
                     └──< conversaciones
                     └──< jobs
```

**Estados de lead:**
`anonimo` → `nuevo` → `contactado` → `interesado` → `cita_agendada` → `completado` / `perdido` / `requiere_humano`

---

## Cómo funciona el agente

1. Llega mensaje (por cualquier canal)
2. Se carga el historial de la conversación desde Supabase
3. Se llama a GPT-4o con las tools disponibles y el system prompt de la clínica
4. Si GPT-4o llama a una tool → se ejecuta → se devuelve resultado → se vuelve a llamar GPT-4o
5. Se guarda el historial actualizado en Supabase
6. Se devuelve la respuesta al canal correspondiente

El agente **nunca toca directamente la base de datos ni el calendario**. Solo actúa a través de las tools.

---

## Tools disponibles del agente

| Tool | Descripción |
|---|---|
| `consultar_disponibilidad` | Slots libres en Google Calendar |
| `crear_cita` | Crea evento en GCal + registro en Supabase |
| `mover_cita` | Mueve evento en GCal + actualiza Supabase |
| `cancelar_cita` | Cancela en GCal + Supabase |
| `buscar_paciente` | Busca por teléfono en Supabase |
| `crear_lead` | Crea o fusiona paciente en Supabase |
| `actualizar_estado_lead` | Actualiza estado del funnel |
| `programar_seguimiento` | Crea job de seguimiento en Supabase |
| `escalar_a_humano` | Cambia estado conversación + notifica a clínica |

---

## Cómo correr el proyecto en local

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # Rellenar variables
uvicorn main:app --reload --port 8000

# Dashboard
cd dashboard
npm install
npm run dev                    # http://localhost:3000
```

**Variables de entorno imprescindibles para desarrollo:**
- `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `FERNET_KEY` (generar con: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)

---

## Convenciones de código

- **Async por defecto** en todos los routers y funciones de I/O
- **clinic_id** siempre como primer parámetro en tools y funciones de DB
- **Pydantic** para validar inputs y outputs de todos los endpoints
- **Logs** con `logging` estándar de Python, nivel INFO en producción
- **Idempotency keys** en todos los jobs: `f"{tipo}_{paciente_id}_{fecha.date()}"`
- Los tokens OAuth **nunca** se devuelven en responses de API

---

## Fases del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Núcleo + panel interno mínimo | Ver PROGRESO.md |
| 2 | Chat web embebible + web demo | Ver PROGRESO.md |
| 3 | Voz (Vapi.ai) | Pendiente |
| 4 | WhatsApp (Meta Cloud API) | Pendiente |
| 5 | Automatizaciones (jobs) | Pendiente |
| 6 | Activación Express + dashboard cliente | Pendiente |

Ver [PROGRESO.md](PROGRESO.md) para el estado detallado actual.
