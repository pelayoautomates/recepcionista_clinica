# Progreso de Implementación

Última actualización: 2026-05-05

---

## Fase 1 — Núcleo + Panel Interno Mínimo

**Objetivo:** Simular conversación desde panel → cita real en Google Calendar.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 1.1 | Archivos de tracking (CONTEXTO, PROGRESO, ARQUITECTURA) | ✅ | |
| 1.2 | Scaffold backend FastAPI | ✅ | main.py con lifespan |
| 1.3 | requirements.txt + .env.example | ✅ | |
| 1.4 | config.py (Pydantic BaseSettings) | ✅ | |
| 1.5 | database/migrations/001_schema.sql | ✅ | 5 tablas + RLS + índices |
| 1.6 | database/client.py (Supabase singleton) | ✅ | |
| 1.7 | models/ (Pydantic models) | ✅ | clinica, paciente, cita, conversacion, job |
| 1.8 | google_calendar/auth.py (OAuth2 + Fernet) | ✅ | Tokens cifrados en Supabase |
| 1.9 | google_calendar/client.py (wrapper GCal API) | ✅ | listar_slots, crear, mover, cancelar |
| 1.10 | tools/calendario.py | ✅ | |
| 1.11 | tools/pacientes.py | ✅ | Con lógica de fusión de leads |
| 1.12 | tools/sistema.py | ✅ | |
| 1.13 | agent/tool_definitions.py (JSON schemas OpenAI) | ✅ | 9 tools definidas |
| 1.14 | agent/prompts.py | ✅ | System prompt parametrizable por clínica |
| 1.15 | agent/core.py (loop function calling GPT-4o) | ✅ | Max 10 iteraciones, guarda historial |
| 1.16 | routers/chat.py (POST /chat) | ✅ | |
| 1.17 | routers/admin.py (APIs panel interno) | ✅ | + auth.py, whatsapp.py, vapi.py |
| 1.18 | dashboard/ scaffold Next.js 14 | ✅ | App Router, Server Components |
| 1.19 | Vista: listado de clínicas con métricas | ✅ | |
| 1.20 | Vista: leads por clínica | ✅ | |
| 1.21 | Vista: conversaciones con mensajes | ✅ | |
| 1.22 | Vista: citas del día | ✅ | |
| 1.23 | Vista: jobs programados y estado | ✅ | |
| 1.24 | Test de aceptación Fase 1 | ⬜ | **Pendiente: rellenar .env y probar** |

---

## Fase 2 — Chat Web

**Objetivo:** Demo presentable a un cliente real.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 2.1 | Widget React embebible (< 50KB) | ⬜ | |
| 2.2 | Lead anónimo → captura teléfono → fusión | ⬜ | |
| 2.3 | Web demo clínica dental (HTML estático) | ⬜ | |
| 2.4 | Handoff a humano en panel | ⬜ | |
| 2.5 | Test de aceptación Fase 2 | ⬜ | Web demo → lead en panel + cita en GCal |

---

## Fase 3 — Voz (Vapi.ai)

**Objetivo:** Paciente llama → habla → cita agendada.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 3.1 | routers/vapi.py (Server URL Vapi) | ⬜ | |
| 3.2 | Configurar assistant en Vapi | ⬜ | |
| 3.3 | Resumen post-llamada en Supabase | ⬜ | |
| 3.4 | Número de prueba activo | ⬜ | |
| 3.5 | Test de aceptación Fase 3 | ⬜ | Llamada real → cita en GCal |

---

## Fase 4 — WhatsApp

**Objetivo:** WhatsApp texto o audio → cita agendada.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 4.1 | routers/whatsapp.py (webhook Meta) | ⬜ | |
| 4.2 | Recepción y envío de texto | ⬜ | |
| 4.3 | Transcripción de audios con Whisper | ⬜ | |
| 4.4 | Plantillas aprobadas (recordatorio 24h, 1h, seguimiento) | ⬜ | |
| 4.5 | Test de aceptación Fase 4 | ⬜ | WA texto/audio → cita en GCal |

---

## Fase 5 — Automatizaciones

**Objetivo:** El sistema trabaja solo, no solo reacciona.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 5.1 | jobs/scheduler.py (APScheduler) | ⬜ | |
| 5.2 | Job: recordatorio 24h antes | ⬜ | |
| 5.3 | Job: recordatorio 1h antes | ⬜ | |
| 5.4 | Job: seguimiento lead frío (24h sin agenda) | ⬜ | |
| 5.5 | Job: resumen diario a clínica (08:00) | ⬜ | |
| 5.6 | Reintentos con backoff (máx 3 intentos) | ⬜ | |
| 5.7 | Test: los 10 escenarios del doc de producto | ⬜ | |

---

## Fase 6 — Activación Express + Dashboard Cliente

**Objetivo:** Onboarding de clínica nueva sin tocar código.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 6.1 | Página OAuth de activación (link único) | ⬜ | |
| 6.2 | Formulario de configuración de la clínica | ⬜ | |
| 6.3 | Panel cliente (separado del panel interno) | ⬜ | |
| 6.4 | Proceso documentado y repetible | ⬜ | |
| 6.5 | Test de aceptación Fase 6 | ⬜ | Onboarding completo sin tocar código |

---

## Decisiones técnicas tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-05-05 | LLM: OpenAI GPT-4o (no Claude) | Preferencia del equipo |
| 2026-05-05 | DB: Supabase + RLS desde Fase 1 | Multi-tenant obligatorio desde inicio |
| 2026-05-05 | APScheduler en MVP (no Celery/Redis) | Simplicidad; migrar cuando escale |
| 2026-05-05 | Número WhatsApp nuevo (no migrar el actual del cliente) | Evitar riesgos con el número productivo del cliente |

---

## Cómo actualizar este archivo

Al completar cualquier tarea:
1. Cambia ⬜ → 🔄 cuando empieces
2. Cambia 🔄 → ✅ cuando termines
3. Actualiza "Última actualización" al principio del archivo
4. Añade notas si tomaste alguna decisión importante
