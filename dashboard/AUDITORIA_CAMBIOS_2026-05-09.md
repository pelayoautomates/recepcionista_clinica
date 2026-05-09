# Auditoria y cambios aplicados (2026-05-09)

## Objetivo
Aplicar el plan de correccion tras auditoria tecnica para mejorar seguridad, consistencia de arquitectura y estabilidad funcional del dashboard.

## Resumen ejecutivo
- Se endurecio seguridad en rutas API criticas (validaciones, control de acceso y limite de superficie).
- Se eliminaron llamadas cliente directas a backend admin en flujos sensibles, sustituyendolas por proxies internos `app/api/*`.
- Se corrigieron fallos de logica detectados en produccion potencial (timezone, link roto, borrado involuntario de horarios, visualizacion de linea actual en calendario, warning de keys en React).
- Se anadio rate limiting en endpoints expuestos y cabeceras de seguridad HTTP globales.
- Se movio el panel de agencia a `/agencia` y se publico la landing en `/` para dominio principal.
- Se verifico compilacion y build de produccion con exito.

## Cambios implementados

### 1) Seguridad API y hardening

#### 1.1 SSRF hardening en demo de scraping
Archivo: `app/api/demo/chat/route.ts`

Se anadio:
- Bloqueo de hosts locales y redes privadas (IPv4 e IPv6).
- Resolucion DNS y validacion de IP resuelta para evitar acceso a red interna.
- Timeout de scraping (`SCRAPE_TIMEOUT_MS`).
- Limite de tamano de respuesta (`MAX_CONTENT_LENGTH`) por cabecera y por contenido real.

Impacto:
- Reduce riesgo de SSRF y abuso de infraestructura interna.

#### 1.2 Validacion estricta de accion en canal voz
Archivo: `app/api/canales/voz/route.ts`

Se anadio whitelist de `accion`:
- Solo acepta `conectar` o `comprar`.
- Respuesta 400 si se envia un valor no permitido.

Impacto:
- Evita forwarding de rutas inesperadas al backend.

#### 1.3 Control de acceso para rutas internas
Nuevo archivo: `lib/auth-utils.ts`

Funciones nuevas:
- `requireAccess()`:
  - valida sesion Supabase.
  - consulta rol real via backend (`/admin/me/rol`).
- `enforceClinicScope()`:
  - restringe acceso por `clinic_id` para rol `clinica`.
  - permite acceso global a rol `agencia`.

Aplicado en:
- `app/api/canales/numeros/route.ts`
- `app/api/canales/voz/route.ts`
- `app/api/clinicas/[id]/invitacion/route.ts`
- `app/api/resumen/route.ts`

Impacto:
- Endpoints sensibles dejan de estar abiertos por defecto.

#### 1.4 Rate limiting
Nuevo archivo: `lib/rate-limit.ts`

Aplicado en:
- `app/api/demo/chat/route.ts`
- `app/api/resumen/route.ts`
- `app/api/chat/route.ts`
- `app/api/invitaciones/vincular/route.ts`
- `app/api/canales/voz/route.ts`
- `app/api/canales/numeros/route.ts`

Impacto:
- Reduce riesgo de abuso, brute force funcional y saturacion de endpoints de coste alto.

#### 1.5 Cabeceras de seguridad HTTP
Archivo: `next.config.js`

Se anadieron cabeceras globales:
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Permissions-Policy` restrictiva en features no usadas
- `Strict-Transport-Security` cuando la peticion llega por HTTPS

Impacto:
- Mejora baseline de hardening del frontend.

### 2) Proxies internos para eliminar llamadas directas cliente -> backend admin

Se crearon rutas proxy internas para operaciones que antes hacian `fetch` directo al backend desde el navegador:

- `app/api/clinicas/route.ts` (POST crear clinica, solo agencia)
- `app/api/clinicas/[id]/route.ts` (PATCH clinica)
- `app/api/clinicas/[id]/citas/route.ts` (GET citas)
- `app/api/clinicas/[id]/configuracion/extraer/route.ts` (POST)
- `app/api/clinicas/[id]/configuracion/guardar/route.ts` (POST)
- `app/api/clinicas/[id]/conversaciones/[convId]/responder/route.ts` (POST)
- `app/api/clinicas/[id]/conversaciones/[convId]/resolver/route.ts` (PATCH)
- `app/api/admin/clinicas/route.ts` (GET, solo agencia)
- `app/api/chat/route.ts` (POST, solo agencia)
- `app/api/me/rol/route.ts` (GET)
- `app/api/invitaciones/vincular/route.ts` (POST, valida usuario de sesion)

Impacto:
- Se centraliza seguridad en servidor.
- Se evita exponer operaciones admin en cliente.

### 3) Refactor de componentes cliente para usar proxies internos

#### 3.1 Configuracion de agente
Archivos:
- `app/panel/configuracion/page.tsx`
- `app/panel/configuracion/ConfiguracionForm.tsx`

Cambio:
- Se elimina dependencia de `backendUrl` en cliente.
- Uso de `/api/clinicas/{id}/configuracion/*`.
- Se evita enviar `horarios: {}` fijo al guardar (ahora preserva horarios existentes con `clinica.horarios || {}`).

#### 3.2 Detalle de conversacion
Archivos:
- `app/panel/conversaciones/[id]/page.tsx`
- `app/panel/conversaciones/[id]/ConversacionDetalle.tsx`

Cambio:
- Responder y resolver ahora usan `/api/clinicas/{id}/conversaciones/{convId}/*`.
- Mejor manejo de error al marcar como resuelta.
- Se agrega prop opcional `backHref` para reutilizacion.

#### 3.3 Calendario
Archivos:
- `app/panel/calendario/page.tsx`
- `app/panel/calendario/CalendarioCliente.tsx`

Cambio:
- Eliminado `backendUrl` en cliente para fetch de citas.
- Ahora usa `/api/clinicas/{id}/citas`.

#### 3.4 Edicion de clinica
Archivos:
- `app/clinicas/[id]/EditClinicaForm.tsx`
- `app/clinicas/[id]/page.tsx`

Cambio:
- PATCH de clinica pasa por `/api/clinicas/{id}`.

#### 3.5 Chat de pruebas (agencia)
Archivo: `app/chat/page.tsx`

Cambio:
- Lista de clinicas via `/api/admin/clinicas`.
- Envio de chat via `/api/chat`.
- Se mejora control de error en carga inicial.

#### 3.6 Completing auth
Archivo: `app/auth/completing/page.tsx`

Cambio:
- Vinculacion de invitacion via `/api/invitaciones/vincular`.
- Comprobacion de rol via `/api/me/rol`.

### 4) Correcciones de logica funcional

#### 4.1 Link roto de detalle en conversaciones de agencia
Nuevo archivo:
- `app/clinicas/[id]/conversaciones/[convId]/page.tsx`

Adicional:
- `ConversacionDetalle` ahora acepta `backHref` para volver a la ruta correcta de agencia.

Impacto:
- Se arregla navegacion a detalle que antes apuntaba a ruta inexistente.

#### 4.2 Fecha local (timezone-safe)
Archivos:
- `app/panel/citas/page.tsx`
- `app/panel/page.tsx`
- `app/clinicas/[id]/citas/page.tsx`

Cambio:
- Se reemplaza `toISOString()` para calcular "hoy" por helper local `YYYY-MM-DD`.

Impacto:
- Evita desalineacion de dia por UTC.

#### 4.3 Linea de hora actual en calendario
Archivo: `app/panel/calendario/CalendarioCliente.tsx`

Cambio:
- La linea roja de "ahora" solo se muestra si la vista incluye el dia actual.

#### 4.4 Warning React por key en lista de leads
Archivo: `app/panel/leads/LeadsClient.tsx`

Cambio:
- Uso de `Fragment` con `key` en el `map`.

### 5) Consistencia de configuracion de agencia

Archivos:
- `app/auth/callback/route.ts`
- `middleware.ts`
- `.env.local.example`

Cambio:
- Unificacion de lectura de emails de agencia con soporte CSV (`AGENCY_EMAIL` y `NEXT_PUBLIC_AGENCY_EMAIL`).
- Comparacion normalizada en lowercase.
- Se anade `AGENCY_EMAIL` a ejemplo de entorno.

### 6) Cambio de enrutado para dominio publico

#### 6.1 Landing en raiz de dominio
Archivo nuevo/actualizado:
- `app/page.tsx`

Cambio:
- La landing principal ahora responde en `/`.

#### 6.2 Dashboard de agencia movido a `/agencia`
Archivo movido:
- de `app/page.tsx` a `app/agencia/page.tsx`

Cambios complementarios:
- `middleware.ts`: reglas de acceso actualizadas para `/agencia`.
- `app/auth/callback/route.ts`: redireccion de agencia a `/agencia`.
- `components/ConditionalNav.tsx`: enlace principal actualizado a `/agencia`.
- `components/AgencyWrapper.tsx`: tratamiento de `/` como full-page para la landing.
- `app/clinicas/[id]/page.tsx`: boton de vuelta hacia `/agencia`.

Impacto:
- `atiende360.com` puede servir directamente la landing publica.
- El panel de agencia queda en ruta separada y protegida.

## Verificaciones ejecutadas

### Typecheck
Comando:
`npx tsc --noEmit`

Resultado:
- OK (sin errores de TypeScript).

### Build produccion
Comando:
`npm run build`

Resultado:
- OK (build completada, rutas compiladas correctamente).

## Notas para otra IA (handoff)

1. **No revertir cambios de seguridad en proxies**:
   - La estrategia actual prioriza que el cliente no llame directo a backend admin.

2. **Si se aplica politica "solo comprar numero"**:
   - Cambiar `app/api/canales/voz/route.ts` para permitir solo `comprar`.
   - Ajustar UI de `app/panel/canales/CanalesClient.tsx` eliminando modo "conectar existente".

3. **Siguiente mejora recomendada**:
   - Configurar ESLint no interactivo en repo (ahora `next lint` pide setup).
   - Estandarizar errores API (`detail`, `code`) para frontend.

4. **Contexto importante**:
   - El repo tiene cambios previos no relacionados; este documento describe solo los cambios aplicados en esta iteracion.
