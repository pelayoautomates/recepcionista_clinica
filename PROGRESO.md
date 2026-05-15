# Progreso de Implementación

Última actualización: 2026-05-15

---

## SEO + GEO implementado (2026-05-15)

### Bloque 18 — Blog + llms.txt + robots mejorado (completado)

- **`dashboard/lib/blog-posts.ts`** (nuevo): 4 artículos keyword-targeted:
  - `como-reducir-no-shows-clinica-privada` (7 min, gestión de citas)
  - `inteligencia-artificial-para-clinicas-guia` (9 min, IA para clínicas)
  - `como-automatizar-recordatorios-citas-clinica` (6 min, automatización)
  - `software-agenda-clinica-fisioterapia-rehabilitacion` (7 min, fisio)
- **`dashboard/app/blog/page.tsx`** (nuevo): índice del blog con cards y Schema.org Blog
- **`dashboard/app/blog/[slug]/page.tsx`** (nuevo): artículo individual con Schema.org BlogPosting, breadcrumb, metadata dinámica
- **`dashboard/public/llms.txt`** (nuevo): protocolo GEO — describe el producto para que ChatGPT, Gemini y Claude lo indexen con contexto correcto
- **`dashboard/app/robots.ts`**: añadidos GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, Applebot, Perplexity-User — todos los crawlers de IA explícitamente permitidos
- **`dashboard/app/sitemap.ts`**: añadido `/blog` y 4 artículos individuales con `lastModified` por fecha de publicación
- **`dashboard/middleware.ts`**: `/blog` añadido a `PUBLIC_PREFIXES`, `/llms.txt` añadido a `PUBLIC_PATHS`

### Lo que ya tenía el proyecto (bien hecho por Codex):
- Schema.org: Organization, WebSite, WebPage, SoftwareApplication, FAQPage, BreadcrumbList en homepage
- Meta tags: title, description, canonical, OG tags, Twitter card
- sitemap.ts con páginas públicas correctas
- robots.ts base con OAI-SearchBot

### Pendiente para SEO continuo (no urgente, semanas 2-4):
1. Escribir 4-6 artículos más al mes (el blog ya está montado, solo añadir a `blog-posts.ts`)
2. Solicitar indexación en Google Search Console tras primer deploy
3. Registrar en directorios: Capterra, GetApp, G2 Crowd (clave para GEO)
4. Conseguir menciones en blogs sectoriales (dental, fisio, salud digital España)

---

## Auditoría completa pre-beta (2026-05-15)

### Bugs críticos identificados (pendientes de fix)

| # | Bug | Archivo | Impacto |
|---|---|---|---|
| C1 | `check_plan_active()` sync en contexto async → bloquea event loop | `billing.py` + `core.py:87` | CRÍTICO — estabilidad bajo carga |
| C2 | Race condition en `incrementar_minutos()` — sin transacción atómica | `billing.py:76-84` | CRÍTICO — billing incorrecto |
| C3 | clinic_id no validado contra tabla `clinicas` en `run_agent()` | `core.py:21` | ALTO — conversaciones fantasma |
| C4 | `webhook_events` tabla crece indefinidamente | `webhook_dedupe.py` | MEDIO — limpieza necesaria |
| C5 | Resumen diario se genera pero NO se envía (TODO en código) | `scheduler.py:227` | MEDIO — feature prometida |
| C6 | Si `RETELL_WS_SECRET` ausente en Railway → WS sin autenticar | `retell.py:103` | ALTO si no se configura |

### Pendientes manuales críticos antes de activar beta

| Acción | Dónde | Bloqueante |
|---|---|---|
| Ejecutar `013_webhook_events.sql` | Supabase SQL Editor | SÍ — dedupe no funciona sin tabla |
| Ejecutar `014_performance_indexes.sql` | Supabase SQL Editor | No crítico pero recomendado |
| Configurar `RETELL_WS_SECRET` | Railway env vars | SÍ — WebSocket sin auth |
| Reprovisionar agentes Retell | POST /admin/clinicas/{id}/retell/agent | SÍ — URL WS sin token |
| Configurar `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Railway | SÍ — checkout/portal rotos |
| Configurar `STRIPE_PRICE_STARTER/PRO/GROWTH` | Railway | SÍ — checkout falla |
| Configurar `TELNYX_SMS_NUMBER` | Railway | No crítico — recordatorios SMS no salen |
| Verificar `GOOGLE_REDIRECT_URI` exacto | Railway + Google Cloud Console | Bug B2 conocido |

### Estado real del código (auditoría 2026-05-15)

| Módulo | Estado | Notas |
|---|---|---|
| `agent/core.py` | ✅ Funcional | Bug C1 y C3 pendientes |
| `agent/prompts.py` | ✅ Funcional | routing_mode, servicios, conocimiento inyectados |
| `security.py` | ✅ Funcional | Fail-closed prod OK |
| `billing.py` | ⚠️ Funcional con bugs | C1 (sync) + C2 (race condition) |
| `retell_manager.py` | ✅ Funcional | Token en WS URL OK, idempotente |
| `routers/retell.py` | ✅ Funcional | Dedupe + clinic_agent binding OK |
| `routers/whatsapp.py` | ✅ Funcional | 3 BSPs, dedupe, firma validada |
| `routers/admin.py` | ✅ Funcional | Paginación + UTC helper OK |
| `routers/stripe_billing.py` | ✅ Funcional | Webhooks Stripe OK |
| `routers/registro.py` | ✅ Funcional | Trial 7 días OK |
| `jobs/scheduler.py` | ⚠️ Funcional | SMS Telnyx OK, resumen no se envía |
| `webhook_dedupe.py` | ✅ Funcional | Fail-open, sin limpieza automática |
| `telnyx_sms.py` | ✅ Funcional | asyncio.run() workaround (aceptable) |
| `twilio_wa.py` | ✅ Funcional | |
| `scoring.py` | ✅ Funcional | |
| `routers/configuracion.py` | ✅ Funcional | |
| Dashboard (Next.js) | ✅ 95% prod-ready | Todos imports OK, sin builds rotos |

### Funcionalidades de mercado pendientes (prioridad para beta)

1. **Confirmación activa en recordatorio** — paciente responde "1" o "Sí" al SMS para confirmar. Sin confirmación → alerta a clínica. Reduce no-shows 30-50%.
2. **Cancelación self-service** — link en SMS/WA para cancelar sin llamar. Fácil de implementar en telnyx_sms.py.
3. **Lista espera automática** — al cancelar, contactar primero de lista_espera. Requiere job en scheduler.
4. **Estadísticas no-shows** en panel — ya hay datos en DB, falta UI.
5. **Resumen diario por email** — código ya existe en scheduler.py, falta integrar Resend/SMTP.
6. **DPA firmable en onboarding** — requerimiento legal RGPD para datos de salud.

---

## Registro de cambios recientes (2026-05-13)

### Bloque 1 - Seguridad y multi-tenant (completado)

- `backend/security.py`: `/admin` fail-closed en producción si falta `ADMIN_API_KEY`.
- Protección con `require_admin_key` en routers sensibles (`invitaciones`, `registro`, `billing checkout/portal`).
- OAuth Google endurecido con `state` firmado + nonce cookie anti-CSRF/replay.
- `agent/core.py`: validaciones por `clinic_id` en conversación y updates; billing centralizado con `skip_billing` solo para test admin.
- `whatsapp.py` y `retell.py`: fallback funcional para `PlanInactivo` y `MinutosAgotados`.
- Eliminado fallback inseguro "primera clínica" en routing Twilio/Meta.
- Webhook Twilio validado por firma `X-Twilio-Signature`.

### Bloque 2 - Retell + dedupe webhooks (completado)

- `backend/config.py`: nueva variable `RETELL_WS_SECRET`.
- `backend/retell_manager.py`: incluye token en `llm_websocket_url`; refresca agente existente en `provision_clinic_agent`.
- `backend/routers/retell.py`:
  - autorización de WS por token (query/header)
  - validación `clinic_id <-> retell_agent_id`
  - dedupe de webhook Retell por clave de evento.
- `backend/routers/whatsapp.py`: dedupe para Meta, Twilio y 360dialog.
- Nuevo módulo `backend/webhook_dedupe.py`.
- Nueva migración `backend/database/migrations/013_webhook_events.sql`.

### Bloque 3 - OptimizaciÃ³n de consultas y payload (completado)

- `backend/routers/admin.py`:
  - paginaciÃ³n (`limit`/`offset`) en listados de alto volumen:
    - conversaciones
    - leads
    - citas
    - lista de espera
    - recuperaciÃ³n
  - `conversaciones` ahora soporta:
    - `include_mensajes` (default `false`)
    - `fecha=YYYY-MM-DD` para filtrar por dÃ­a
- Dashboard ajustado para pedir menos datos:
  - `panel/page`: conversaciones del dÃ­a (`limit=60`) + citas (`limit=120`)
  - `panel/conversaciones`: `limit=250`
  - `panel/leads`: `limit=300`
  - `panel/citas`: `limit=250`
- Nueva migraciÃ³n de Ã­ndices:
  - `backend/database/migrations/014_performance_indexes.sql`
  - Ã­ndices orientados a `clinic_id + updated_at/created_at` para acelerar listados.


### Bloque 4 - Google Calendar sync en panel de citas (completado)

- Eliminada auto-sync en cada carga de `dashboard/app/panel/citas/page.tsx`.
- Nuevo flujo en `dashboard/app/panel/citas/CitasClient.tsx`:
  - boton `Sincronizar ahora` (solo si `tieneGcal`)
  - estado de carga `Sincronizando...`
  - mensaje de resultado con `importados/actualizados`
  - `router.refresh()` al terminar para recargar citas
- Se mantiene la sincronizacion automatica por scheduler backend cada 60 minutos.
- Beneficio: menos llamadas innecesarias a Google Calendar y mejor latencia inicial del panel.

### Bloque 5 - Timezone correcto en filtros diarios (completado)

- `backend/routers/admin.py` incorpora `_utc_bounds_for_local_day(fecha_iso)` para convertir dia local (`Europe/Madrid`) a rango UTC exacto.
- Aplicado en:
  - `listar_conversaciones(fecha=...)`
  - `listar_citas(fecha=...)`
  - `metricas_clinica` (hoy/ayer locales)
  - `leads_recuperacion` (corte de >3 dias)
- Se reemplaza el patron `T00:00:00Z / T23:59:59Z` por `gte(inicio_utc)` + `lt(fin_utc)` para evitar errores de borde y cambios de hora.
- Beneficio: coherencia de datos diarios (citas, conversaciones y metricas) para clinicas en Espana.

### Bloque 6 - Normalizacion de textos en panel de citas (completado)

- Reescrito `dashboard/app/panel/citas/CitasClient.tsx` para eliminar mojibake en textos visibles.
- Ejemplos corregidos: `No asistio`, `Hoy -`, `Telefono`, `Duracion`.
- Se mantiene funcionalidad existente del bloque anterior:
  - sync manual Google Calendar
  - estado de carga y mensaje de resultado
  - modal de detalle y `router.refresh()`
- Beneficio: UI limpia y legible para cliente final.

### Bloque 7 - Feedback UX consistente en sync de citas (completado)

- `dashboard/app/panel/citas/CitasClient.tsx` ahora diferencia estado de resultado (`success`/`error`) para la sync manual.
- Mensajeria de resultado con color semantico:
  - error: rojo
  - exito: verde
- Accesibilidad: `aria-busy` durante carga y `role=alert/status` en respuesta.
- Beneficio: mejor claridad operativa para usuario final cuando sincroniza Google Calendar.

### Bloque 8 - Estabilidad leads/conversaciones + feedback unificado (completado)

- Restaurados componentes faltantes que estaban referenciados por `LeadsWrapper`:
  - `dashboard/app/panel/lista-espera/ListaEsperaClient.tsx`
  - `dashboard/app/panel/recuperacion/RecuperacionClient.tsx`
- `dashboard/app/panel/conversaciones/[id]/ConversacionDetalle.tsx` mejorado con:
  - estados `loading/success/error` para resolver y responder
  - avisos visuales de estado (exito/error)
  - `aria-busy` y `role=alert/status`
- Normalizacion extra de textos en:
  - `dashboard/app/panel/leads/LeadsClient.tsx`
  - `dashboard/app/panel/leads/LeadsWrapper.tsx`
- Beneficio: evita fallos por imports rotos y deja UX consistente en flujos de operacion diaria.

### Bloque 9 - Feedback UX unificado en agenda (completado)

- Aplicado patron `loading/success/error` en tabs clave de agenda:
  - `dashboard/app/panel/agenda/ServiciosTab.tsx`
  - `dashboard/app/panel/agenda/ProfesionalesTab.tsx`
  - `dashboard/app/panel/agenda/SalasTab.tsx`
  - `dashboard/app/panel/agenda/BloquesTab.tsx`
- Cada tab ahora muestra avisos semanticos tras mutaciones (guardar, activar/desactivar y eliminar).
- Se anaden estados de error explicitos para fallos de red/API.
- Beneficio: consistencia de UX entre modulos operativos del panel.
 
### Bloque 10 - Cobertura de feedback en subcomponentes de agenda (completado)

- `dashboard/app/panel/agenda/ProfesionalesTab.tsx`:
  - `DisponibilidadEditor` ahora valida `res.ok` y maneja errores reales en `load/save`.
  - avisos `success/error` con `role=alert/status` al cargar y guardar horario.
- `dashboard/app/panel/agenda/ServiciosTab.tsx`:
  - `ProfAsignados` ahora valida API en asignar/desasignar y carga inicial.
  - avisos `success/error` para confirmar cambios o fallos.
- `dashboard/app/panel/agenda/ReglasTab.tsx`:
  - unificado al patron de `notice` (`success/error`) en guardado.
  - `aria-busy` en boton durante guardado.
- Beneficio: cobertura total del patron UX en agenda, incluyendo subflujos de disponibilidad y asignacion.

### Bloque 11 - Correccion de feedback en canal de voz (completado)

- `dashboard/app/panel/canales/CanalesClient.tsx`:
  - `handleDesconectar` ahora valida `res.ok` y muestra error real de API si falla.
  - `voiceSuccess` pasa de booleano a mensaje (`string | null`) para feedback mas preciso.
  - se limpian estados previos (`voiceError/voiceSuccess`) al iniciar acciones de conectar, desconectar, buscar y comprar.
  - mensajes de exito con `role=status` para accesibilidad.
- Beneficio: evita falsos positivos de "desconectado" y mejora claridad operativa en configuracion de voz.

### Bloque 12 - Saneado de textos mojibake en configuracion/canales (completado)

- `dashboard/app/panel/configuracion/ConfiguracionWrapper.tsx`:
  - saneados textos visibles con caracteres corruptos.
  - corregidos efectos secundarios funcionales en inputs (`value`/`onChange`) tras limpieza.
  - restaurados textos de botones/iconos que quedaron vacios (`x`, `->`) y mensajes de carga (`...`).
- `dashboard/app/panel/canales/CanalesClient.tsx`:
  - saneados textos visibles con caracteres corruptos.
  - corregidos `value` en `input/select/option` para evitar regresiones de formulario.
- Verificacion tecnica:
  - ambos archivos quedaron en ASCII limpio (sin caracteres de reemplazo ni null bytes).
- Beneficio: UX legible y consistente, sin texto roto en vistas operativas clave.

### Bloque 13 - Hotfix de compilacion en Configuracion (completado)

- `dashboard/app/panel/configuracion/ConfiguracionWrapper.tsx`:
  - corregido token JSX invalido en el boton de envio del drawer de test.
  - reemplazado contenido problematico por texto estable (`Enviar`).
- Beneficio: elimina bloqueo de compilacion reportado en `npm run build` (linea 558).

### Bloque 14 - Lint no interactivo para CI (completado)

- `dashboard/.eslintrc.json` (nuevo):
  - configuracion minima con `next/core-web-vitals`.
- `dashboard/package.json`:
  - anadidas devDependencies:
    - `eslint`
    - `eslint-config-next`
- Beneficio: `npm run lint` deja de abrir el asistente interactivo y queda apto para CI.

### Bloque 15 - Correccion de errores ESLint bloqueantes (completado)

- `dashboard/app/panel/configuracion/TestAgente.tsx`:
  - corregidos textos con comillas sin escapar en JSX (`react/no-unescaped-entities`).
- `dashboard/app/privacidad/page.tsx`:
  - reemplazados enlaces internos `<a href=\"/...\">` por `Link` de Next.js.
  - corregida entidad de comillas en `Supresion ("derecho al olvido")`.
- `dashboard/app/terminos/page.tsx`:
  - reemplazados enlaces internos `<a href=\"/...\">` por `Link` de Next.js.
  - corregidas comillas sin escapar en textos legales.
- Resultado esperado: `npm run lint` y `npm run build` sin errores bloqueantes de ESLint.

### Bloque 16 - Limpieza de warning hooks en marketing (completado)

- `dashboard/components/marketing/AgentDemoSandbox.tsx`:
  - eliminado `useCallback` innecesario en `startListening` para evitar warning de dependencia faltante (`sendVoiceMessage`).
- Resultado esperado: `lint/build` sin warning de `react-hooks/exhaustive-deps` en ese archivo.

### Bloque 17 - Estabilizacion final de dependencias hook en marketing (completado)

- `dashboard/components/marketing/AgentDemoSandbox.tsx`:
  - `beginConnected` pasa de `useCallback` a funcion normal para evitar dependencia inestable de `startListening`.
  - se elimina el warning restante de `react-hooks/exhaustive-deps` reportado en `:120:9` (impactando deps en linea `253` del bloque previo).
- Resultado esperado: `npm run lint` y `npm run build` sin warnings en `AgentDemoSandbox.tsx`.
### Pendientes operativos inmediatos tras Bloque 2

1. Ejecutar migración `013_webhook_events.sql` en Supabase.
2. Definir `RETELL_WS_SECRET` en producción.
3. Reprovisionar/actualizar agentes Retell para propagar URL WS con token.
4. Validar retries reales de webhooks y confirmar cero duplicados.

### Pendientes operativos inmediatos tras Bloque 3

1. Ejecutar migraciÃ³n `014_performance_indexes.sql`.
2. Medir latencia real post-migraciÃ³n en endpoints de listado del panel.
3. Usar `include_mensajes=true` solo en vistas que realmente necesiten historial completo.


### Pendientes operativos inmediatos tras Bloque 4

1. Validar en staging que el scheduler sigue sincronizando citas de Google Calendar sin depender de la carga de la pagina.
2. Medir descenso de llamadas sync-gcal en logs (antes/despues) para confirmar ahorro.

### Pendientes operativos inmediatos tras Bloque 5

1. Probar en staging con citas/conversaciones cerca de medianoche local (23:30-00:30) para validar que aparecen en el dia correcto.
2. Confirmar que los KPIs de hoy/ayer del panel coinciden con consultas manuales en Supabase.
### Pendientes operativos inmediatos tras Bloque 6

1. Validar en navegador que no quedan caracteres corruptos en otras vistas del panel (leads, conversaciones, configuracion).
2. Si aparecen mas casos, aplicar el mismo saneado por archivo para evitar regresiones de encoding.
### Pendientes operativos inmediatos tras Bloque 7

1. Revisar que el color de estado se vea bien en diferentes resoluciones y contraste.
2. Replicar este patron de feedback (success/error/cargando) en otras acciones del panel.
### Pendientes operativos inmediatos tras Bloque 8

1. Validar build de Next.js en entorno con `npm` disponible para confirmar que se resolvio el problema de imports faltantes.
2. Verificar manualmente acciones de lista de espera y recuperacion en staging (notificar, marcar, eliminar, reenganchar).
3. Extender el mismo patron de feedback a otras acciones de panel (agenda/canales/configuracion).
### Pendientes operativos inmediatos tras Bloque 9

1. Validar visualmente en staging los avisos de estado en escritorio y movil.

### Pendientes operativos inmediatos tras Bloque 10

1. Ejecutar build/lint de Next.js en entorno con `npm` para validar compilacion y tipado final.
2. Validar manualmente en staging:
   - disponibilidad por profesional (cargar/guardar)
   - asignaciones de profesionales por servicio (asignar/desasignar)
   - reglas globales (guardar + feedback de error/exito)

### Pendientes operativos inmediatos tras Bloque 11

1. Validar en staging el flujo de voz:
   - desconectar numero con respuesta OK
   - simular fallo API y confirmar mensaje de error real
   - reconectar/comprar numero y confirmar mensaje de exito correcto

### Pendientes operativos inmediatos tras Bloque 12

1. Revisar visualmente en staging `Configuracion` y `Canales` (desktop + movil) para validar copy final.
2. Ejecutar build/lint de Next.js en entorno con `npm` para confirmar que no hay regresiones de tipado/render.

### Pendientes operativos inmediatos tras Bloque 13

1. Re-ejecutar `npm run build` para confirmar cierre del P1 reportado (`ConfiguracionWrapper.tsx`).
2. Completar QA manual de `Configuracion`, `Canales` y `Agenda` en navegador con DevTools.
3. Configurar ESLint del proyecto para evitar prompt interactivo y habilitar `npm run lint` no interactivo.

### Pendientes operativos inmediatos tras Bloque 14

1. Ejecutar `npm install` en `dashboard` para actualizar `package-lock.json` con las nuevas devDependencies.
2. Re-ejecutar `npm run lint` y compartir salida completa para cerrar validacion CI.
3. Completar QA manual de `Configuracion`, `Canales` y `Agenda` en navegador con DevTools.

### Pendientes operativos inmediatos tras Bloque 15

1. Re-ejecutar `npm run lint` y `npm run build` para confirmar cierre total de errores.
2. Revisar warning restante en `components/marketing/AgentDemoSandbox.tsx` (`react-hooks/exhaustive-deps`) y decidir si se corrige ahora o se difiere.
3. Completar QA manual de `Configuracion`, `Canales` y `Agenda` en navegador con DevTools.

### Pendientes operativos inmediatos tras Bloque 16

1. Re-ejecutar `npm run lint` y `npm run build` para confirmar salida limpia final.
2. Completar QA manual de `Configuracion`, `Canales` y `Agenda` en navegador con DevTools.

### Pendientes operativos inmediatos tras Bloque 17

1. Re-ejecutar `npm run lint` y `npm run build` para confirmar cierre sin warnings nuevos en marketing.
2. Completar QA manual de `Configuracion`, `Canales` y `Agenda` en navegador con DevTools.
### Estado de pruebas

- En esta máquina no se pudieron ejecutar tests Python por falta de runtime Python instalado/configurado.
- En esta maquina no se pudo ejecutar build/lint de Next.js porque `npm` no esta disponible.

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
| B1 | Google Calendar OAuth: "Error guardando tokens" | ✅ Corregido en código | auth.py reescrito: páginas de error con URI configurado + endpoint /auth/google/debug/config (X-Admin-Key) |
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
| 6.7 | Wizard de alta self-service (/onboarding) | ✅ | 3 pasos: datos → extracción IA → listo. Crea clínica + vincula usuario + arranca trial |
| 6.8 | Trial 7 días con bloqueo automático | ✅ | trial_expires_at en DB; panel redirige a /suscripcion al expirar; banner si quedan ≤3 días |
| 6.9 | Página /suscripcion (paywall) | ✅ | Muestra plan Starter + CTA a pricing |
| 6.10 | Checklist flotante en panel | ✅ | 4 pasos: clínica / agente / GCal / teléfono. Desaparece al completar |
| 6.11 | Test de aceptación Fase 6 | ⬜ | Onboarding completo sin tocar código |
| 6.12 | Landing comercial pública de Atiende360 (`/landing`) | ✅ | Hero + problema + solución + pasos + beneficios + casos + producto + pricing + add-ons + comparativa + garantía + FAQ + CTA |
| 6.13 | Calendario Atiende360 (fase 1: vistas + CRUD) | ✅ | Vistas día/semana/mes, multi-profesional, bloques de agenda, CRUD completo |
| 6.14 | Calendario Atiende360 (fase 2: servicios + disponibilidad + conflictos) | ✅ | Catálogo de servicios, horario semanal por profesional, validación de conflictos, origen de cita, filtros |

---

## Pendiente antes del lanzamiento (≤1 semana)

| # | Tarea | Prioridad |
|---|---|---|
| P1 | Ejecutar migration 004_calendar.sql en Supabase SQL Editor | 🔴 URGENTE |
| P2 | Ejecutar migration 005_services_availability.sql en Supabase SQL Editor | 🔴 URGENTE |
| P3 | PKCE auth fix: en Supabase Auth → URL Configuration → Site URL = https://atiende360.com | 🔴 URGENTE |
| P4 | Configurar número WhatsApp real (META_ACCESS_TOKEN + META_PHONE_NUMBER_ID) | 🟡 |
| P5 | Crear agente Retell per-clínica (actualmente usan agente global) | 🟡 |
| P6 | Plantillas WhatsApp aprobadas por Meta (recordatorios) | 🟡 |

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

## Registro de cambios recientes (2026-05-12)

### Google OAuth + Legal + WhatsApp Twilio + Routing + Test agente

- **`backend/google_calendar/auth.py`**: scope cambiado a `calendar.events` (mínimo necesario, más fácil verificación Google)

- **`dashboard/app/privacidad/page.tsx`** (nuevo): Política de privacidad completa RGPD + LOPDGDD, datos de salud art.9, tabla subprocesadores, derechos interesados. URL pública: `/privacidad`

- **`dashboard/app/terminos/page.tsx`** (nuevo): Términos de servicio completos, DPA art.28 RGPD integrado, limitación responsabilidad, jurisdicción Madrid. URL pública: `/terminos`

- **`dashboard/components/marketing/MarketingShell.tsx`**: links Privacidad + Términos en footer (requerido por Google OAuth verification)

- **`dashboard/middleware.ts`**: `/privacidad`, `/terminos`, `/widget` añadidos a rutas públicas

- **Google OAuth verification**: branding verificado ✅. Scope `calendar.events` enviado para revisión.

- **`backend/database/migrations/012_routing_notif_twilio.sql`** (nuevo — unifica 012+013):
  - `routing_mode` TEXT CHECK (siempre/fuera_horario/si_no_contestan)
  - `notification_email` TEXT
  - `twilio_whatsapp_number` TEXT
  - **Ejecutar manualmente en Supabase SQL Editor**

- **`backend/routers/configuracion.py`**: acepta `routing_mode` y `notification_email` en `guardar_configuracion`

- **`backend/agent/prompts.py`**: inyecta contexto de routing en el prompt según modo seleccionado

- **`backend/routers/admin.py`**: `POST /admin/clinicas/{id}/test-chat` — chat de prueba sin billing check

- **`backend/twilio_wa.py`** (nuevo): cliente Twilio WhatsApp — `send_message()` + `get_clinic_by_twilio_number()`

- **`backend/routers/whatsapp.py`**: endpoint `POST /whatsapp/twilio` para recibir mensajes del sandbox/producción Twilio

- **`backend/config.py`**: vars `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`

- **`dashboard/app/panel/configuracion/RoutingConfig.tsx`** (nuevo): UI routing — selector 3 modos + email notificaciones

- **`dashboard/app/panel/configuracion/TestAgente.tsx`** (nuevo): chat UI completo para probar agente sin consumir minutos

- **`dashboard/app/panel/configuracion/ConfiguracionWrapper.tsx`**: 4 tabs (Clínica y agente / Conocimiento / Llamadas / Probar agente)

- **`dashboard/app/api/clinicas/[id]/test-chat/route.ts`** (nuevo): proxy autenticado al endpoint de test

### Decisiones tomadas hoy

- **WhatsApp BSP**: Twilio en vez de 360dialog (360dialog partner = 500€/mes mínimo, inviable para MVP)
- **Meta for Developers**: cuenta personal baneada — no usar Facebook para esto
- **Modelo WhatsApp**: número por clínica en DB, un solo `TWILIO_ACCOUNT_SID` en Railway (escalable)
- **Handoff a humano**: de momento solo visual en panel — notificaciones (Telegram/email) en siguiente fase
- **Google OAuth scope**: `calendar.events` en vez de `calendar` completo (recomendación correcta)

### Sesión tarde — WA reply + Canales UI Twilio (2026-05-12)

- **`backend/routers/admin.py`** — `responder_manualmente` ahora envía el mensaje al WhatsApp del paciente via Twilio tras guardarlo en DB. Lookup de `canal` y `paciente.telefono` desde la conversación.

- **`backend/routers/canales.py`** — GET `/canales` devuelve `twilio_whatsapp_number` + `twilio_configured` en vez de campos `dialog360_*`. SELECT actualizado para no pedir columnas 360dialog.

- **`dashboard/app/panel/canales/CanalesClient.tsx`** — Sección WhatsApp reescrita: reemplaza 360dialog por UI Twilio. Si configurado → badge Activo + número. Si no → badge "Sandbox activo", instrucciones contactar `hola@atiende360.com` + número sandbox `+1 415 523 8886`.

- **`dashboard/app/panel/canales/page.tsx`** — Props actualizados: `twilioNumber` + `twilioConfigured` en vez de `whatsappNumber` + `dialog360`.

### Configuración UX — página unificada (2026-05-12)

- **`dashboard/app/panel/configuracion/ConfiguracionWrapper.tsx`** — reescrito completamente:
  - Sin tabs: una sola página scroll vertical
  - Sección "Rellenar con IA" colapsable (URL + docs)
  - Sección "Información" — textarea editable (el cerebro del agente)
  - Sección "Cómo habla" — 3 preset cards: Profesional / Cercano / Formal
  - Sección "Cuándo atiende llamadas" — routing selector inline
  - Sección "Email de notificaciones"
  - Un solo botón "Guardar todo" — persiste todos los campos
  - Botón "Probar agente" → drawer lateral deslizante (no tab separado)
  - Tono guardado en `servicios._tono` para persistencia entre sesiones

### SMS Telnyx para recordatorios (2026-05-12)

- **`backend/telnyx_sms.py`** (nuevo): `send_sms()`, `recordatorio_cita()`, `seguimiento_lead()` via Telnyx REST API. Más barato que Twilio (~$0.04-0.08/SMS ES). Usa misma API key de Telnyx ya configurada.

- **`backend/config.py`**: `telnyx_sms_number` — número remitente SMS (añadir `TELNYX_SMS_NUMBER` en Railway)

- **`backend/jobs/scheduler.py`**: recordatorios 24h/1h y seguimiento lead usan `telnyx_sms` en vez de `whatsapp`. Eliminado `_get_clinic_wa()` y dependencia de `whatsapp.py`.

- **`backend/routers/canales.py`**: GET devuelve `sms_activo: bool` basado en `TELNYX_SMS_NUMBER` configurado.

- **`dashboard/app/panel/canales/CanalesClient.tsx`**: nueva card SMS con badge Activo (verde) / Pendiente configurar (gris).

### Decisión: WhatsApp producción

- Producción requiere Meta Business Account de Atiende360 (no personal FB) + Twilio gestiona submission
- Para MVP: sandbox Twilio para demos, SMS Telnyx para recordatorios reales
- WhatsApp producción se activa cuando haya clientes reales pagando

### Pendiente manual
- Ejecutar `012_routing_notif_twilio.sql` en Supabase
- Añadir `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` en Railway
- Añadir `TELNYX_SMS_NUMBER` en Railway (número Telnyx con messaging habilitado)
- Configurar webhook Twilio → `https://api.atiende360.com/webhook/whatsapp/twilio`
- Completar cuenta `hola@atiende360.com` en Hostinger

---

## Registro de cambios recientes (2026-05-11 — sesión tarde)

### Bloque 7 — B1 fix + Retell per-clínica + 360dialog + Widget + Tests

- **`backend/routers/auth.py`** — reescrito completamente (Fix B1)
  - Callback robusto: `?error=` → HTML denegado; sin `code`/`state` → 400 con URI configurado; state no-UUID → 400; token save error → 500 con URI para diagnóstico
  - `_error_html()` y `_SUCCESS_HTML` — páginas HTML inline claras para el clínico
  - `GET /auth/google/debug/config` (X-Admin-Key) — devuelve `google_redirect_uri` e instrucciones de fix

- **`backend/database/migrations/011_retell_dialog360.sql`** (nuevo)
  - Columnas en `clinicas`: `retell_agent_id`, `dialog360_api_key`, `dialog360_phone_id`, `dialog360_waba_id`, `dialog360_webhook_url`
  - Índices parciales en ambas columnas para lookup eficiente
  - **Ejecutar manualmente en Supabase SQL Editor**

- **`backend/retell_manager.py`** (nuevo)
  - `create_agent_for_clinic(clinic_id, clinic_name)` — POST a Retell API con `metadata: {clinic_id}`, `llm_websocket_url` apunta al backend
  - `provision_clinic_agent(clinic_id, clinic_name)` — idempotente: verifica DB antes de crear
  - Admins pueden provisionar via `POST /admin/clinicas/{id}/retell/agent`

- **`backend/dialog360.py`** (nuevo)
  - `send_message(api_key, to, text)` — POST a `https://waba.360dialog.io/v1/messages` con `D360-API-KEY`
  - `send_template(api_key, to, template_name, lang, components)` — mensajes de plantilla
  - `download_media(api_key, media_id)` — descarga audio/imagen
  - `transcribe_audio(api_key, audio_id, openai_api_key)` — Whisper transcripción
  - `get_clinic_by_phone_id(phone_number_id)` — lookup en Supabase por `dialog360_phone_id`

- **`backend/routers/whatsapp.py`** — reescrito con soporte 360dialog
  - `_process_wa_message()` — helper compartido entre Meta y 360dialog
  - Endpoint `GET/POST /whatsapp/360dialog` — verifica webhook + lookup por `dialog360_phone_id`
  - Endpoint Meta existente sin cambios funcionales

- **`backend/routers/canales.py`** — añadido
  - `PATCH /clinicas/{id}/canales/360dialog` — guarda credenciales 360dialog
  - `DELETE /clinicas/{id}/canales/360dialog` — elimina credenciales

- **`backend/routers/admin.py`** — añadido
  - `POST /admin/clinicas/{id}/retell/agent` — provisionar agente Retell
  - `GET /admin/clinicas/{id}/retell/agent` — info agente actual
  - `DELETE /admin/clinicas/{id}/retell/agent` — eliminar agente

- **`dashboard/components/PanelSidebar.tsx`** — rediseño sidebar
  - `NAV_MAIN`: Conversaciones, Leads, Citas, Calendario
  - `NAV_AJUSTES`: Configuración, Facturación
  - Logo = `<Link href="/panel">` (clickable)
  - Eliminados: Inicio, Canales, Agenda IA, Conocimiento, Lista de espera, Recuperación (integrados en tabs)

- **`dashboard/app/panel/conversaciones/ConversacionesWrapper.tsx`** (nuevo)
  - Tabs: Conversaciones | Canales
  - `CanalesClient` con prop `compact` embebido en tab Canales

- **`dashboard/app/panel/leads/LeadsWrapper.tsx`** (nuevo)
  - Tabs: Leads | Lista de espera | Recuperación (con count badges)

- **`dashboard/app/panel/configuracion/ConfiguracionWrapper.tsx`** (nuevo)
  - Tabs: Clínica y agente | Conocimiento

- **`dashboard/app/panel/canales/CanalesClient.tsx`** — actualizado
  - Sección WhatsApp: UI de setup 360dialog (instrucciones paso a paso + form API Key + Phone ID + WABA ID)
  - Prop `compact?: boolean` para uso embebido en tab

- **`dashboard/app/api/canales/whatsapp-360/route.ts`** (nuevo)
  - POST/DELETE para guardar/eliminar credenciales 360dialog

- **`dashboard/app/widget/[clinicId]/page.tsx`** (nuevo — público)
  - Sin auth, `force-dynamic`
  - Muestra: nombre clínica + botón WhatsApp (`wa.me`) + botón llamar (`tel:`)
  - NO chat IA, NO booking — solo info + redirección
  - URL: `/widget/{clinicId}`

- **`dashboard/middleware.ts`**: `/widget` añadido a `PUBLIC_PREFIXES` (sin auth)

- **`backend/tests/conftest.py`** (nuevo): env vars dummy + fixtures `sample_clinic_id`, `sample_lead`
- **`backend/tests/test_scoring.py`** (nuevo): 7 tests (score completo, mínimo, capped, sin datos, estado inválido, enriquecer)
- **`backend/tests/test_billing.py`** (nuevo): 7 tests (trial activo/expirado/sin expires, plan cancelado, minutos agotados, starter activo/cancelado)
- **`backend/tests/test_retell.py`** (nuevo): 10 tests (extract_clinic_id, conversation_id, retell_response, signature)
- **`backend/tests/test_dialog360.py`** (nuevo): 5 tests async (send_message ok/fail/network, get_clinic_by_phone_id found/not_found)
- **`backend/tests/test_auth_gcal.py`** (nuevo): 7 tests async (callback: missing/denied/invalid_state/token_error/success, debug sin/con admin key)
- **`backend/requirements.txt`**: añadido `pytest>=8.0`, `pytest-asyncio>=0.23`

### Pendiente manual (ejecutar en Supabase)
- `011_retell_dialog360.sql`

---

## Registro de cambios recientes (2026-05-11)

### Bloque 2 — WhatsApp centralizado + Scheduler + Audit log

- **`backend/whatsapp.py`** (nuevo módulo centralizado)
  - Todas las funciones de envío WhatsApp aquí: `recordatorio_cita()`, `seguimiento_lead()`, `enviar_mensaje()`
  - Routing per-clínica: `_phone_number_id(clinic_wa_number)` — usa número de clínica primero, fallback global
  - Función `_template_message()` para plantillas aprobadas Meta

- **`backend/jobs/scheduler.py`** refactorizado
  - `_get_clinic_wa(db, clinic_id)` obtiene `whatsapp_number` de la clínica
  - `_enviar_recordatorio_whatsapp()` y `_enviar_seguimiento_lead()` usan `whatsapp.py`
  - `scheduler_status()` expuesto para `/health`

- **`backend/main.py`**: `/health` incluye `scheduler_status()`

- **`backend/database/migrations/008_audit_log.sql`**: tabla `audit_log` (clinic_id, tabla, accion, registro_id, antes/despues JSONB, created_at)

### Bloque 3 — Panel Agenda mejorado

- **`dashboard/app/panel/agenda/BloquesTab.tsx`** (nuevo)
  - Lista de bloqueos de agenda (festivos, vacaciones, etc.)
  - Modal crear: datetime-local, tipo (festivo/vacaciones/mantenimiento/otro), profesional, sala opcionales
  - Color-coded left border por tipo; botón eliminar con confirm
  - Auto-fetch en mount (no server-side)

- **`dashboard/app/panel/agenda/ServiciosTab.tsx`** — añadido
  - Componente `ProfAsignados`: lazy-load al pulsar botón, pill-buttons toggle asignación
  - POST para asignar, DELETE para desasignar profesional a servicio
  - Fix JSX: wrapper `<div>` en `.map()` para permitir `ProfAsignados` como hermano del card

- **`dashboard/app/panel/agenda/AgendaConfig.tsx`**: 5 tabs ahora (servicios / profesionales / salas / reglas / bloqueos)

### Bloque 4 — Stripe Billing

- **`backend/billing.py`** (nuevo)
  - `check_plan_active(clinic_id)`: lanza `PlanInactivo` o `MinutosAgotados`; pasa si `plan=null/trial` sin expirar
  - `incrementar_minutos(clinic_id, minutos)`: silent failure
  - Planes: starter=300min, pro=750min, growth=1800min

- **`backend/routers/stripe_billing.py`** (nuevo router)
  - `POST /billing/checkout`: crea/reutiliza Stripe Customer, crea Checkout Session
  - `POST /billing/portal`: Customer Portal
  - `POST /billing/webhook`: maneja `checkout.session.completed`, `subscription.updated/deleted`, `invoice.payment_failed`
  - `metadata.clinic_id` en Checkout Session para tenant isolation

- **`backend/config.py`**: campos `stripe_secret_key`, `stripe_webhook_secret`, `stripe_price_*`, `dashboard_url`

- **`backend/routers/chat.py`**: enforcement `check_plan_active()` al inicio; HTTP 402 si plan inactivo o minutos agotados

- **`dashboard/app/api/billing/checkout/route.ts`** y **`portal/route.ts`**: auth-gated proxies; usan `access.clinicId` (camelCase)

- **`dashboard/app/panel/facturacion/page.tsx`** + **`FacturacionClient.tsx`**:
  - Badge plan + estado suscripción
  - Barra de uso de minutos (azul→naranja→rojo en 90%)
  - Botón Customer Portal (si tiene Stripe customer)
  - Cards de upgrade condicionales según plan actual

- **Pendiente manual Railway**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/PRO/GROWTH`
- **Pendiente Stripe Dashboard**: webhook apuntando a `https://<backend>/billing/webhook`

### Bloque 5 — Base de conocimiento (conocimientos)

- **`backend/database/migrations/009_conocimiento.sql`**: tabla `conocimientos` (clinic_id, titulo, contenido, tipo, activo, orden)
  - tipos: faq / proceso / precio / politica / otro

- **`backend/agent/prompts.py`**: `build_system_prompt()` acepta `conocimiento=` list; inyecta entradas activas como sección `## Base de conocimiento` en el system prompt

- **`backend/routers/admin.py`**: CRUD `/admin/clinicas/{id}/conocimiento` + `/{entry_id}`

- **`dashboard/app/panel/conocimiento/page.tsx`** + **`ConocimientoClient.tsx`**:
  - Lista de entradas por tipo, toggle activo, drag-reorder (orden), crear/editar/eliminar
  - `dashboard/app/api/clinicas/[id]/conocimiento/route.ts` + `[entryId]/route.ts`

- **`dashboard/app/panel/layout.tsx`**: fetch `metricas` paralelo a `clinica`; pasa `pendientesHumano` al sidebar

- **`dashboard/components/PanelSidebar.tsx`**: badge rojo en Conversaciones si `pendientesHumano > 0`; links Conocimiento + Facturación

### Bloque 6 — Lead scoring + Lista de espera + Recuperación

- **`backend/scoring.py`** (nuevo)
  - `calcular_score(lead)`: rule-based 0-100; factores: nombre/tel/email (+10/+20/+10), canal (voz+25/wa+20), estado (cita_agendada+45...), historial+10, recencia (<24h+10, <7d+5)
  - `enriquecer_leads(leads)`: añade `scoring` a cada lead
  - NOTA: `pendiente_confirmacion` eliminado del scoring (no existe en DB CHECK constraint)

- **`backend/database/migrations/010_bloque6.sql`**: tabla `lista_espera` (clinic_id, paciente_id, servicio_nombre, profesional_id, notas, estado, notificado_at)
  - estados: esperando / notificado / agendado / cancelado

- **`backend/tools/sistema.py`**: `agregar_a_lista_espera(paciente_id, servicio_nombre, notas)` — con guard si paciente no existe

- **`backend/agent/tool_definitions.py`**: tool `agregar_a_lista_espera` añadida; `pendiente_confirmacion` eliminado del enum de `actualizar_estado_lead`

- **`backend/agent/core.py`**: dispatch para `agregar_a_lista_espera`

- **`backend/routers/admin.py`** (añadido):
  - GET `/admin/clinicas/{id}/leads` → incluye scoring via `enriquecer_leads()`
  - CRUD `/admin/clinicas/{id}/lista-espera` + `/{entrada_id}`
  - GET `/admin/clinicas/{id}/recuperacion` → leads perdidos + sin actividad >3d con teléfono
  - POST `/admin/clinicas/{id}/leads/{lead_id}/seguimiento` → job inmediato de seguimiento WhatsApp

- **`dashboard/app/panel/leads/LeadsClient.tsx`**: columna Score + `ScoreBadge` (verde/amarillo/rojo), sort por fecha/score, colSpan corregido a 7

- **`dashboard/app/panel/lista-espera/page.tsx`** + **`ListaEsperaClient.tsx`**:
  - Lista con badges estado; Notificar (PATCH estado+notificado_at), Marcar agendado, Cancelar, Eliminar

- **`dashboard/app/panel/recuperacion/page.tsx`** + **`RecuperacionClient.tsx`**:
  - Lista de leads para re-enganchar; botón "Re-enganchar" → POST seguimiento; feedback ok/error por fila

- **`dashboard/app/api/clinicas/[id]/lista-espera/route.ts`** + **`[entradaId]/route.ts`**
- **`dashboard/app/api/clinicas/[id]/leads/[leadId]/seguimiento/route.ts`**

- **`dashboard/components/PanelSidebar.tsx`**: links Lista de espera (reloj) + Recuperación (refresh)

- **Pendiente manual Supabase**: ejecutar `009_conocimiento.sql` y `010_bloque6.sql` en SQL Editor

---

## Registro de cambios recientes (2026-05-09)

- **Pivote a SaaS self-service — panel CEO eliminado**
  - Eliminados: `/agencia`, `/clinicas/*`, `/chat` (panel de agencia)
  - Eliminados: `/api/admin/clinicas`, `/api/chat` (API routes solo agencia)
  - `dashboard/middleware.ts`: simplificado, sin lógica de email de agencia
  - `dashboard/app/auth/callback/route.ts`: routing sin rol agencia; sin clínica → `/onboarding`
  - `dashboard/lib/auth-utils.ts`: `enforceClinicScope` elimina check agencia

- **Wizard de onboarding self-service** (`/onboarding`)
  - 3 pasos: datos clínica → entrena agente (extracción IA de URL) → listo
  - Crea la clínica y la vincula al usuario automáticamente
  - Arranca el trial de 7 días desde el primer login

- **Trial 7 días**
  - `backend/database/migrations/003_trial.sql`: columnas `trial_expires_at`, `plan`, `url_web`, `especialidad`, `onboarding_step`, `onboarding_ok`
  - `backend/routers/registro.py`: endpoint `POST /saas/clinicas/registro`
  - `backend/routers/invitaciones.py`: `/me/rol` devuelve `trial_expires_at`, `plan`, `onboarding_ok`
  - `dashboard/app/panel/layout.tsx`: redirige a `/suscripcion` si trial expirado; banner amarillo/rojo si quedan ≤3 días

- **Página de suscripción** (`/suscripcion`)
  - Paywall limpio cuando el trial ha expirado

- **Checklist flotante de onboarding** (`OnboardingChecklist.tsx`)
  - Widget en esquina inferior derecha del panel
  - Muestra: Clínica configurada / Agente entrenado / Google Calendar / Número de teléfono
  - Desaparece cuando todos los pasos están completos; se puede minimizar o cerrar

- **Actualización de planes (minutos)**
  - Starter: 150 min → **300 min**
  - Pro: 400 min → **750 min**
  - Growth: 900 min → **1.800 min**

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

- **Landing comercial completa de Atiende360**
  - `dashboard/app/landing/page.tsx`: nueva landing pública orientada a conversión con estructura SaaS completa.
  - `dashboard/middleware.ts`: `/landing` pasa a ser ruta pública (sin login obligatorio).
  - `dashboard/components/ConditionalNav.tsx` y `dashboard/components/AgencyWrapper.tsx`: se ocultan wrappers/nav internos en `/landing` para layout de marketing full-width.

- **Landing v2 optimizada a conversion**
  - Rediseno total de `dashboard/app/landing/page.tsx` con enfoque CRO y persuasivo:
    - Hero mas claro orientado a resultado.
    - Bloque de perdida potencial (loss aversion) con calculadora visual.
    - Menor friccion de decision (Hick's Law): CTAs principales consistentes.
    - Pricing con arquitectura de eleccion y plan recomendado.
    - Refuerzo de riesgo bajo (prueba 7 dias) en multiples puntos.

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








