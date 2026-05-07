# Arquitectura — Recepcionista IA para Clínicas

---

## Flujo de una conversación (cualquier canal)

```
PACIENTE
   │
   ├── Chat Web ──────────────────────┐
   ├── WhatsApp (Meta Cloud API) ─────┤
   └── Llamada (Retell AI) ───────────┤
                                      │
                                      ▼
                              ┌───────────────┐
                              │  FastAPI       │
                              │  Backend       │
                              │  (Railway)     │
                              └──────┬────────┘
                                     │
                              ┌──────▼────────┐
                              │  Agent Core   │
                              │  (GPT-4o)     │
                              │               │
                              │  1. Carga     │
                              │     historial │
                              │  2. Llama LLM │
                              │  3. Ejecuta   │
                              │     tools     │
                              │  4. Guarda    │
                              │     historial │
                              │     limpio    │
                              └──────┬────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
        ┌──────▼──────┐    ┌─────────▼───────┐   ┌────────▼──────┐
        │  Google     │    │  Supabase        │   │  Notificación  │
        │  Calendar   │    │  (PostgreSQL)    │   │  a clínica     │
        │  API        │    │                  │   │  (handoff)     │
        └─────────────┘    └─────────────────┘   └───────────────┘
```

---

## Flujo detallado — Function Calling con GPT-4o

```
1. Mensaje entra al router (chat/whatsapp/retell)
   │
2. Router llama agent/core.py → run_agent(clinic_id, conversacion_id, mensaje)
   │
3. Carga historial desde Supabase (tabla conversaciones)
   │
4. OpenAI API call:
   openai.chat.completions.create(
     model="gpt-4o",
     messages=[system_prompt, ...historial, user_message],
     tools=[...tool_definitions]
   )
   │
5. ¿Respuesta tiene tool_calls?
   │
   ├── NO → Devolver texto al canal. Guardar en historial limpio. FIN.
   │
   └── SÍ → Para cada tool_call:
              │
              ├── consultar_disponibilidad → Google Calendar API
              ├── crear_cita → Google Calendar API + Supabase
              ├── mover_cita → Google Calendar API + Supabase
              ├── cancelar_cita → Google Calendar API + Supabase
              ├── buscar_paciente → Supabase
              ├── crear_lead → Supabase
              ├── actualizar_estado_lead → Supabase
              ├── programar_seguimiento → Supabase (tabla jobs)
              └── escalar_a_humano → Supabase + Notificación
              │
              └── Añadir resultados como tool messages
                  → Volver al paso 4 (loop)
```

---

## Modelo de datos

```
┌─────────────────────────────────────────────────────────┐
│ clinicas                                                 │
│ ─────────────────────────────────────────────────────── │
│ id UUID PK                                               │
│ nombre TEXT                                              │
│ telefono TEXT                                            │
│ whatsapp_number TEXT                                     │
│ email_contacto TEXT                                      │
│ horarios JSONB     { "lun": {"start":"09:00","end":"20:00"} } │
│ servicios JSONB    [{"nombre":"Limpieza","duracion_min":60}]  │
│ prompt_personalizado TEXT                                │
│ google_tokens_enc TEXT  ← cifrado con Fernet             │
│ created_at TIMESTAMPTZ                                   │
└──────────────────────────┬──────────────────────────────┘
                           │ 1:N
          ┌────────────────┴────────────────────┐
          │                                     │
┌─────────▼──────────────┐          ┌───────────▼──────────┐
│ pacientes               │          │ jobs                  │
│ ─────────────────────── │          │ ───────────────────── │
│ id UUID PK              │          │ id UUID PK            │
│ clinic_id UUID FK       │          │ clinic_id UUID FK     │
│ nombre TEXT             │          │ paciente_id UUID FK   │
│ telefono TEXT           │          │ tipo TEXT             │
│ email TEXT              │          │ fecha_programada TS   │
│ canal_origen TEXT       │          │ estado TEXT           │
│ estado_lead TEXT        │          │ idempotency_key TEXT  │
│ historial_resumen TEXT  │          │ payload JSONB         │
│ created_at TS           │          │ error TEXT            │
└──────┬──────────────────┘          └──────────────────────┘
       │ 1:N
       ├─────────────────────────────────┐
       │                                 │
┌──────▼──────────────────┐   ┌──────────▼──────────────┐
│ citas                    │   │ conversaciones           │
│ ──────────────────────── │   │ ──────────────────────── │
│ id UUID PK               │   │ id UUID PK               │
│ clinic_id UUID FK        │   │ clinic_id UUID FK        │
│ paciente_id UUID FK      │   │ paciente_id UUID FK      │
│ google_event_id TEXT     │   │ canal TEXT               │
│ tipo_servicio TEXT       │   │ mensajes JSONB           │
│ fecha_inicio TS          │   │ estado TEXT              │
│ fecha_fin TS             │   │ created_at TS            │
│ estado TEXT              │   │ updated_at TS            │
│ created_at TS            │   └──────────────────────────┘
└──────────────────────────┘
```

---

## Estados de lead

```
anonimo ──► nuevo ──► contactado ──► interesado ──► cita_agendada ──► completado
                                                          │
                                                          └──────────► perdido
                                                          │
                                                     (cualquier estado)
                                                          │
                                                          └──────────► requiere_humano
```

---

## Automatizaciones (Fase 5)

```
APScheduler (corre dentro de FastAPI en MVP)
   │
   ├── Cada minuto: buscar jobs pendientes con fecha_programada <= ahora
   │     │
   │     ├── recordatorio_24h → WhatsApp plantilla RECORDATORIO_24H
   │     ├── recordatorio_1h → WhatsApp plantilla RECORDATORIO_1H
   │     ├── seguimiento_lead → WhatsApp plantilla SEGUIMIENTO_LEAD
   │     └── resumen_diario → Genera resumen GPT-4o → Email/Telegram clínica
   │
   └── Cada job tiene idempotency_key → no se ejecuta dos veces
```

---

## Multi-tenancy y seguridad

```
Request llega con clinic_id
   │
   ├── Backend valida que clinic_id existe
   ├── Todas las queries incluyen WHERE clinic_id = ?
   ├── RLS en Supabase: política por clinic_id
   ├── Tokens GCal cifrados con Fernet (clave por instalación, no por clínica)
   └── panel interno: acceso solo por la agencia
       panel cliente: acceso solo a su clinic_id
```

---

## Endpoints principales

```
POST /chat                    ← Chat web (widget)
POST /webhook/whatsapp        ← Meta Cloud API webhook
GET  /webhook/whatsapp        ← Verificación webhook Meta
WS   /retell/llm-websocket    ← Custom LLM WebSocket de Retell
POST /retell/webhook          ← Eventos HTTP de Retell

GET  /admin/clinicas          ← Lista de clínicas
GET  /admin/clinicas/{id}/leads
GET  /admin/clinicas/{id}/conversaciones
GET  /admin/clinicas/{id}/citas
GET  /admin/clinicas/{id}/jobs

GET  /auth/google/{clinic_id}          ← Inicia OAuth flow
GET  /auth/google/callback             ← Callback OAuth
```

---

## Notas operativas de UI (2026-05-07)

- Vista de conversación en panel clínica filtra mensajes técnicos (`tool/system`) y payloads JSON para mostrar solo el hilo entendible por recepción.
- La configuración del agente se centra en "Info extraída" editable; el system prompt se deriva de esos datos y queda en modo avanzado para usuarios técnicos.

---

## Diagrama de despliegue

```
Internet
   │
   ├── Widget embebido en web clínica ──► POST /chat ──► Railway (FastAPI)
   ├── Meta Cloud API ──────────────────► POST /webhook/whatsapp
   └── Retell AI ───────────────────────► WS /retell/llm-websocket
                                               │
                                          Railway (FastAPI)
                                               │
                                    ┌──────────┼──────────┐
                                    │          │          │
                               Supabase    OpenAI    Google Calendar
                               (PostgreSQL) (GPT-4o)  API
                                    │
                               Vercel (Next.js dashboard)
                               └── Supabase client directo
```
