# Progreso de Implementación

Última actualización: 2026-05-06

---

## Fase 1 — Núcleo + Panel Interno + Auth con Roles

**Objetivo:** Simular conversación desde panel → cita real en Google Calendar. Autenticación real con dos paneles diferenciados.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 1.1 | Archivos de tracking (CONTEXTO, PROGRESO) | ✅ | |
| 1.2 | Scaffold backend FastAPI | ✅ | main.py con lifespan; arranca scheduler |
| 1.3 | requirements.txt | ✅ | |
| 1.4 | config.py (Pydantic BaseSettings) | ✅ | Busca .env en backend/ y en raíz |
| 1.5 | database/migrations/001_schema.sql | ✅ | 5 tablas + RLS + índices + trigger updated_at |
| 1.6 | database/migrations/002_auth.sql | ✅ | agencia_admins, clinica_usuarios, invitaciones |
| 1.7 | database/client.py (Supabase singleton) | ✅ | Service role key; bypass RLS |
| 1.8 | models/ (Pydantic models) | ✅ | ClinicaCreate, ClinicaUpdate, ChatRequest |
| 1.9 | google_calendar/auth.py (OAuth2 + Fernet) | ✅ | Tokens cifrados en Supabase; auto-refresh |
| 1.10 | google_calendar/client.py (wrapper GCal) | ✅ | listar_slots_libres, crear, mover, cancelar |
| 1.11 | tools/calendario.py | ✅ | |
| 1.12 | tools/pacientes.py | ✅ | Con lógica de fusión de leads |
| 1.13 | tools/sistema.py | ✅ | programar_seguimiento + escalar_a_humano |
| 1.14 | agent/tool_definitions.py (JSON schemas OpenAI) | ✅ | 9 tools definidas |
| 1.15 | agent/prompts.py | ✅ | System prompt parametrizable; agente = "Valeria" |
| 1.16 | agent/core.py (loop function calling GPT-4o) | ✅ | Max 10 iteraciones; guarda historial sin system |
| 1.17 | routers/chat.py (POST /chat) | ✅ | |
| 1.18 | routers/admin.py (APIs panel interno) | ✅ | CRUD clínicas, leads, conversaciones, citas, jobs, métricas |
| 1.19 | routers/auth.py (OAuth Google Calendar) | ✅ | GET /auth/google/{clinic_id} y /auth/google/callback |
| 1.20 | routers/invitaciones.py | ✅ | Crear invitación, vincular usuario, obtener rol |
| 1.21 | routers/whatsapp.py (webhook Meta) | ✅ | Texto + audio (Whisper) |
| 1.22 | routers/vapi.py (Server URL Vapi) | ✅ | Maneja assistant-request, user-message, end-of-call-report |
| 1.23 | jobs/scheduler.py (APScheduler) | ✅ | Procesa jobs cada 1 min; programa recordatorios cada 1h; backoff 3 intentos |
| 1.24 | Dashboard: scaffold Next.js 15 | ✅ | App Router, Vercel |
| 1.25 | Dashboard: auth Google OAuth con Supabase | ✅ | Login page, /auth/callback, /auth/completing |
| 1.26 | Dashboard: middleware protección de rutas | ✅ | Por email de agencia; redirige según rol |
| 1.27 | Dashboard: panel agencia (nav azul marino) | ✅ | ConditionalNav con badge "Agencia" |
| 1.28 | Dashboard: panel clínica (nav verde) | ✅ | /panel/layout.tsx con badge "Panel Clínica" y nombre |
| 1.29 | Dashboard: listado de clínicas con métricas | ✅ | Cards con badges GCal y WhatsApp |
| 1.30 | Dashboard: detalle clínica | ✅ | Métricas, GCal, WhatsApp, servicios, horarios, formulario edición |
| 1.31 | Dashboard: generación de links de invitación | ✅ | Token one-time, link copiable |
| 1.32 | Dashboard: panel clínica — página inicio | ✅ | Métricas + GCal connect + accesos rápidos |
| 1.33 | Deploy backend en Railway | ✅ | https://recepcionista-clinica-production.up.railway.app |
| 1.34 | Deploy dashboard en Vercel | ✅ | https://recepcionista-clinica.vercel.app |
| 1.35 | Test de aceptación Fase 1 | 🔄 | **Bloqueado por Bug 1 (GCal OAuth)** |

---

## Bugs conocidos activos

| # | Bug | Estado | Detalle |
|---|---|---|---|
| B1 | Google Calendar OAuth: "Error guardando tokens" | 🔄 Pendiente de fix | GOOGLE_REDIRECT_URI mal configurado en Railway o Google Console |
| B2 | Conflicto rutas /auth/google/callback vs /{clinic_id} | 🔄 Corregido en código, pendiente deploy | El orden de rutas en auth.py ya es correcto; verificar que Railway tiene el último deploy |

---

## Fase 2 — Chat Web Embebible

**Objetivo:** Widget embebible en web de clínica. Demo presentable a un cliente real.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 2.1 | Widget React embebible (< 50KB, bundle standalone) | ⬜ | |
| 2.2 | Lead anónimo → captura teléfono → fusión con existente | ⬜ | La lógica de fusión ya existe en tools/pacientes.py |
| 2.3 | Web demo clínica dental (HTML estático) | ⬜ | |
| 2.4 | Vista conversaciones en panel clínica (/panel/conversaciones) | ⬜ | Ruta existe en nav pero página no implementada |
| 2.5 | Vista leads en panel clínica (/panel/leads) | ⬜ | Ruta existe en nav pero página no implementada |
| 2.6 | Vista citas en panel clínica (/panel/citas) | ⬜ | Ruta existe en nav pero página no implementada |
| 2.7 | Vista configuración en panel clínica (/panel/configuracion) | ⬜ | Ruta existe en accesos rápidos pero página no implementada |
| 2.8 | Handoff a humano visible en panel | ⬜ | Backend ya marca esperando_humano; falta notificación UI |
| 2.9 | Test de aceptación Fase 2 | ⬜ | Web demo → lead en panel + cita en GCal |

---

## Fase 3 — Voz (Vapi.ai)

**Objetivo:** Paciente llama → habla → cita agendada.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 3.1 | routers/vapi.py (Server URL Vapi) | ✅ | Maneja todos los tipos de mensaje de Vapi |
| 3.2 | Configurar assistant en Vapi con clinic_id en metadata | ⬜ | El router ya está; falta configurar el assistant en el dashboard de Vapi |
| 3.3 | Resumen post-llamada guardado en Supabase | ✅ | end-of-call-report lo guarda como conversación resuelta |
| 3.4 | Número de prueba activo | ⬜ | |
| 3.5 | Test de aceptación Fase 3 | ⬜ | Llamada real → cita en GCal |

---

## Fase 4 — WhatsApp

**Objetivo:** WhatsApp texto o audio → cita agendada.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 4.1 | routers/whatsapp.py (webhook Meta) | ✅ | Verificación GET + recepción POST |
| 4.2 | Recepción y envío de texto | ✅ | Implementado en whatsapp.py |
| 4.3 | Transcripción de audios con Whisper | ✅ | Implementado en _transcribe_whatsapp_audio() |
| 4.4 | Configurar número en Meta Business | ⬜ | Pendiente configurar META_ACCESS_TOKEN y META_PHONE_NUMBER_ID reales |
| 4.5 | Plantillas aprobadas (recordatorio 24h, 1h, seguimiento) | 🔄 | El código envía texto libre; Meta requiere plantillas aprobadas para mensajes de negocio a cliente |
| 4.6 | Test de aceptación Fase 4 | ⬜ | WA texto/audio → cita en GCal |

---

## Fase 5 — Automatizaciones

**Objetivo:** El sistema trabaja solo, no solo reacciona.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 5.1 | jobs/scheduler.py (APScheduler) | ✅ | BackgroundScheduler en UTC |
| 5.2 | Job: recordatorio 24h antes | ✅ | Lógica implementada; requiere WhatsApp activo |
| 5.3 | Job: recordatorio 1h antes | ✅ | Lógica implementada; requiere WhatsApp activo |
| 5.4 | Job: seguimiento lead frío | ✅ | Lógica implementada; requiere WhatsApp activo |
| 5.5 | Job: resumen diario a clínica (08:00) | 🔄 | Genera el resumen con GPT-4o-mini; solo loguea (TODO: enviar por email/Telegram) |
| 5.6 | Reintentos con backoff (máx 3 intentos) | ✅ | Backoff: 5 min * intento; tras 3 intentos → estado fallido |
| 5.7 | Envío real de resumen diario (email o Telegram) | ⬜ | |
| 5.8 | Test: jobs se programan y ejecutan en producción | ⬜ | Requiere WhatsApp activo |

---

## Fase 6 — Activación Express + Dashboard Cliente Completo

**Objetivo:** Onboarding de clínica nueva sin tocar código.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 6.1 | Flujo de invitación (link único + OAuth + vinculación) | ✅ | Completo e implementado |
| 6.2 | Panel cliente: página inicio con métricas | ✅ | /panel/page.tsx |
| 6.3 | Panel cliente: conversaciones | ⬜ | |
| 6.4 | Panel cliente: leads | ⬜ | |
| 6.5 | Panel cliente: citas | ⬜ | |
| 6.6 | Panel cliente: configuración editable | ⬜ | |
| 6.7 | Formulario de alta de clínica nueva (/clinicas/nueva) | ⬜ | El link existe en la UI pero la página no está implementada |
| 6.8 | Proceso de onboarding documentado y repetible | 🔄 | El flujo técnico funciona; falta documentar pasos para el operador |
| 6.9 | Test de aceptación Fase 6 | ⬜ | Onboarding completo sin tocar código |

---

## Decisiones técnicas tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-05-05 | LLM: OpenAI GPT-4o (no Claude) | Preferencia del equipo |
| 2026-05-05 | DB: Supabase + RLS desde Fase 1 | Multi-tenant obligatorio desde inicio |
| 2026-05-05 | APScheduler en MVP (no Celery/Redis) | Simplicidad; migrar cuando escale |
| 2026-05-05 | Número WhatsApp nuevo (no migrar el actual del cliente) | Evitar riesgos con el número productivo del cliente |
| 2026-05-05 | Auth dashboard: Supabase Auth + Google OAuth | Sin contraseñas; flujo limpio para la agencia y para los clientes |
| 2026-05-05 | Dos paneles distintos (agencia azul / clínica verde) | Separación clara de contexto; middleware por email de agencia |
| 2026-05-05 | Invitaciones con token one-time en localStorage | Funciona sin magic links de email; compatible con OAuth de Google |
| 2026-05-05 | Next.js 15 con params async | Requisito del framework; `params` es Promise en Next.js 15 |

---

## Próximas acciones prioritarias

1. **Fix Bug B1:** Verificar y corregir `GOOGLE_REDIRECT_URI` en Railway y Google Cloud Console
2. **Confirmar Bug B2 resuelto:** Verificar que Railway tiene el deploy con el orden correcto de rutas en `auth.py`
3. **Implementar subpáginas del panel clínica:** `/panel/conversaciones`, `/panel/leads`, `/panel/citas`, `/panel/configuracion`
4. **Implementar `/clinicas/nueva`:** Formulario de alta de clínica
5. **Conectar número WhatsApp real:** Configurar Meta Business y probar end-to-end
6. **Test de aceptación completo:** Chat → lead → cita en GCal real

---

## Cómo actualizar este archivo

Al completar cualquier tarea:
1. Cambia ⬜ → 🔄 cuando empieces
2. Cambia 🔄 → ✅ cuando termines
3. Actualiza "Última actualización" al principio del archivo
4. Añade notas si tomaste alguna decisión importante
