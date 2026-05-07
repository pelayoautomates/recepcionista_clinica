# Progreso de Implementación

Última actualización: 2026-05-08

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
| 1.16 | agent/core.py (loop function calling GPT-4o) | ✅ | Max 10 iteraciones; guarda historial limpio (solo user/assistant) |
| 1.17 | routers/chat.py (POST /chat) | ✅ | |
| 1.18 | routers/admin.py (APIs panel interno) | ✅ | CRUD clínicas, leads, conversaciones, citas, jobs, métricas |
| 1.19 | routers/auth.py (OAuth Google Calendar) | ✅ | GET /auth/google/{clinic_id} y /auth/google/callback |
| 1.20 | routers/invitaciones.py | ✅ | Crear invitación, vincular usuario, obtener rol |
| 1.21 | routers/whatsapp.py (webhook Meta) | ✅ | Texto + audio (Whisper) |
| 1.22 | routers/retell.py (WebSocket + webhook Retell) | ✅ | Maneja response_required, reminder_required, call_ended/call_analyzed |
| 1.23 | jobs/scheduler.py (APScheduler) | ✅ | Procesa jobs cada 1 min; programa recordatorios cada 1h; backoff 3 intentos |
| 1.24 | Dashboard: scaffold Next.js 15 | ✅ | App Router, Vercel |
| 1.25 | Dashboard: auth Google OAuth con Supabase | ✅ | Login page, /auth/callback, /auth/completing |
| 1.26 | Dashboard: middleware protección de rutas | ✅ | Por email de agencia; redirige según rol |
| 1.27 | Dashboard: panel agencia (nav azul marino) | ✅ | ConditionalNav con badge "Agencia" |
| 1.28 | Dashboard: panel clínica (nav verde) | ✅ | /panel/layout.tsx con badge "Panel Clínica" y nombre |
| 1.29 | Dashboard: listado de clínicas con métricas | ✅ | Cards con badges GCal y WhatsApp |
| 1.30 | Dashboard: detalle clínica | ✅ | Métricas, GCal, WhatsApp, servicios, horarios, formulario edición |
| 1.31 | Dashboard: generación de links de invitación | ✅ | Token permanente estático (expires_at=null), sin expiración |
| 1.32 | Dashboard: panel clínica — página inicio | ✅ | Métricas + GCal connect + convs/leads de hoy |
| 1.33 | Deploy backend en Railway | ✅ | https://recepcionista-clinica-production.up.railway.app |
| 1.34 | Deploy dashboard en Vercel | ✅ | https://recepcionista-clinica.vercel.app |
| 1.35 | Test de aceptación Fase 1 | 🔄 | **Bloqueado por Bug 1 (GCal OAuth)** |

---

## Bugs conocidos activos

| # | Bug | Estado | Detalle |
|---|---|---|---|
| B1 | Google Calendar OAuth: "Error guardando tokens" | 🔄 Pendiente de fix | GOOGLE_REDIRECT_URI mal configurado en Railway o Google Console |
| B2 | Conflicto rutas /auth/google/callback vs /{clinic_id} | 🔄 Corregido en código, pendiente deploy | El orden de rutas en auth.py ya es correcto; verificar que Railway tiene el último deploy |
| B3 | CEO no puede entrar a panel agencia | ✅ Corregido | Middleware usa `AGENCY_EMAIL`/`NEXT_PUBLIC_AGENCY_EMAIL`; `DEFAULT_AGENCY_EMAIL` corregido a `pelayo.negueruela@gmail.com` |

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

## Fase 3 — Voz (Retell AI)

**Objetivo:** Paciente llama → habla → cita agendada.

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 3.1 | routers/retell.py (Custom LLM WebSocket + webhook) | ✅ | Maneja protocolo Retell + persistencia de resumen |
| 3.2 | Configurar agent en Retell con clinic_id en metadata | ⬜ | El router ya está; falta configurar el agent y numero en dashboard Retell |
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
| 6.3 | Panel cliente: conversaciones | ✅ | Lista con canal/estado + detalle con burbujas de chat + Resumen con IA (llama /api/resumen → OpenAI) |
| 6.4 | Panel cliente: leads | ✅ | Tabla con filas expandibles; muestra info, resumen e historial del paciente |
| 6.5 | Panel cliente: citas | ✅ | Lista con click-to-detail; modal muestra paciente, teléfono, hora, duración, canal |
| 6.6 | Panel cliente: configuración editable | ✅ | Info extraída editable + regeneración automática de prompt + modo avanzado |
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
| 2026-05-06 | Invitaciones permanentes (expires_at=null) | Clínica tiene link fijo que puede guardar como favorito, sin regenerar |
| 2026-05-06 | Migración Vapi → Retell AI (voz) | GDPR nativo, precio transparente ($0.07/min), mejor latencia, voces ES mejor |
| 2026-05-06 | Seguridad: X-Admin-Key en todos los /admin/* | Sin esta protección cualquiera podía leer/modificar datos de todas las clínicas |
| 2026-05-06 | Config IA: GPT-4o extrae info de web/docs → genera prompt | Onboarding sin fricción; `POST /admin/clinicas/{id}/configuracion/extraer` |
| 2026-05-07 | Rediseño UI: Plus Jakarta Sans, nuevo sistema de diseño | Minimalista, ejecutivo para agencia; médico-profesional para clínica |
| 2026-05-07 | Configuración centrada en info extraída (sin migración DB) | Reducir complejidad para recepcionista y mantener persistencia en campos existentes |
| 2026-05-05 | Next.js 15 con params async | Requisito del framework; `params` es Promise en Next.js 15 |

---

## Registro de cambios recientes (2026-05-08)

- **Bug fix: routing CEO redirigía al panel clínica**
  - `dashboard/middleware.ts`: `DEFAULT_AGENCY_EMAIL` corregido a `pelayo.negueruela@gmail.com`

- **Panel sidebar — rediseño UX**
  - `dashboard/components/PanelSidebar.tsx`: eliminado el selector de clínica (solo queda nombre en logo); icono Configuración corregido a rueda dentada real; icono Citas cambiado a clipboard/lista (distinto al de Calendario)

- **Panel inicio — métricas mejoradas**
  - `dashboard/app/panel/page.tsx`: eliminada métrica "Escaladas a humano", reemplazada por "Leads captados hoy" con ícono de persona + check

- **Panel citas — detalle en modal**
  - `dashboard/app/panel/citas/CitasClient.tsx` (nuevo): componente cliente con cards clickables + modal con paciente, teléfono, fecha, hora, duración y canal de origen

- **Panel leads — filas expandibles**
  - `dashboard/app/panel/leads/LeadsClient.tsx` (nuevo): tabla con rows expandibles que muestran info completa del paciente, resumen e historial, y link a conversaciones

- **Panel conversaciones — resumen con IA**
  - `dashboard/app/panel/conversaciones/[id]/ConversacionDetalle.tsx`: añadido botón "Resumen con IA" en el sidebar; llama a `/api/resumen` y muestra el resultado en un bloque violeta
  - `dashboard/app/api/resumen/route.ts` (nuevo): ruta POST que llama OpenAI gpt-4o-mini para resumir los mensajes (requiere `OPENAI_API_KEY` en Vercel)

- **Calendario — botón conectar si no hay GCal**
  - `dashboard/app/panel/calendario/page.tsx`: pasa `tieneCalendario` y `googleAuthUrl` al cliente
  - `dashboard/app/panel/calendario/CalendarioCliente.tsx`: si no hay Google Calendar conectado, muestra pantalla de conexión con botón oficial de Google

## Registro de cambios recientes (2026-05-07)

- **Conversaciones limpias para recepcionista**
  - `backend/agent/core.py`: el historial persistido ahora excluye mensajes técnicos y valores vacíos (`tool/system/null`).
  - `dashboard/app/panel/conversaciones/[id]/ConversacionDetalle.tsx`: renderiza solo mensajes legibles (`user`/`assistant`) y oculta payloads JSON técnicos.

- **Configuración de agente orientada a operación**
  - `dashboard/app/panel/configuracion/ConfiguracionForm.tsx`: rediseño completo con tres pestañas (`Info extraída`, `Generar con IA`, `Avanzado`).
  - `Info extraída` ahora es editable (servicios, horarios, resumen, FAQs, tono, etc.).
  - El `prompt_personalizado` se regenera automáticamente desde la info editada, salvo si se activa edición manual en modo avanzado.
  - Persistencia sin migraciones: se guarda en `servicios`, `horarios` y `prompt_personalizado`.

- **Rediseño visual minimalista del panel clínica**
  - `dashboard/app/panel/layout.tsx` y `dashboard/components/PanelNavLinks.tsx`: navegación y topbar más limpias, mejor jerarquía visual.

- **Credibilidad en integraciones (Google/WhatsApp)**
  - Nuevo componente: `dashboard/components/BrandLogos.tsx`.
  - Integración en `dashboard/app/panel/page.tsx`, `dashboard/app/clinicas/[id]/page.tsx` y `dashboard/app/clinicas/[id]/GoogleCalendarButton.tsx`.

- **Acceso CEO/agencia corregido**
  - `dashboard/middleware.ts`: normaliza email de usuario, soporta múltiples correos de agencia separados por coma y evita fallo por variable vacía en Vercel.

---

## Próximas acciones prioritarias

1. **Retell: terminar configuración** — Webhook Settings en dashboard Retell + metadata clinic_id + RETELL_API_KEY en Railway
2. **Fix Bug B1:** Verificar y corregir `GOOGLE_REDIRECT_URI` en Railway y Google Cloud Console
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
