# Auditoria integral de Atiende360

Fecha: 20 de agosto de 2026  
Alcance: producto, SaaS, cliente, marketing, ventas, mercado, seguridad, privacidad, IA, operaciones y codigo.

> Este documento contiene analisis tecnico y operativo. Los puntos juridicos deben validarse con abogado o DPO antes de tratar datos reales.

## Dictamen ejecutivo

Atiende360 tiene mas producto construido que un MVP habitual: voz, WhatsApp, agenda, calendario, leads, conversaciones, billing, protocolos por vertical y panel operativo. Sin embargo, no debe escalar captacion todavia. El principal riesgo no es la falta de funciones, sino la diferencia entre lo que se promete, lo que se activa y lo que se puede operar de forma fiable.

La estrategia recomendada es:

1. Foco inicial en clinicas de medicina estetica independientes, con 2-10 profesionales, ticket medio alto y llamadas perdidas durante tratamientos o fuera de horario.
2. Vender un resultado: recuperar primeras consultas que hoy no se atienden y convertirlas en cita o tarea humana trazable.
3. Usar desvio por no respuesta conservando el numero habitual del cliente.
4. Activacion asistida y una sede por cuenta hasta demostrar onboarding repetible y retencion.
5. Posponer dental hasta tener integracion real con gestores dominantes; no priorizar psicologia por su mayor riesgo operativo y de datos.
6. No ampliar funcionalidades hasta probar con 5-10 clinicas que llamada perdida -> respuesta -> cita correcta -> valor medible funciona de extremo a extremo.

## Estado de produccion observado

Bloqueantes externos detectados mediante comprobaciones de solo lectura:

- El backend publico responde `503/degraded` y no conecta con Supabase.
- El hostname Supabase configurado no resuelve DNS.
- `app.atiende360.com` no resuelve; `atiende360.com` si responde.
- El despliegue observado no coincide completamente con el scheduler del repositorio.

No incorporar pacientes reales hasta restaurar la base de datos, comprobar backups/PITR, aplicar migraciones, desplegar por SHA conocido y completar un smoke test de todos los canales.

## Posicionamiento recomendado

Propuesta principal:

> Atiende360 recupera las primeras consultas que tu clinica estetica pierde cuando nadie puede responder. Atiende llamadas, agenda valoraciones y deja a tu equipo el contexto para intervenir.

No posicionar el producto como otra agenda, un chatbot generico o un sustituto completo de recepcion. Voz, WhatsApp y agenda se estan comoditizando; la defensa debe estar en flujo vertical, integraciones, seguridad, activacion y medicion de conversion.

### ICP inicial

- Clinica estetica, laser o capilar independiente.
- 2-10 profesionales y una sede.
- Mas de 80 contactos entrantes al mes o al menos 20 llamadas perdidas por semana.
- Primera venta o valoracion con valor potencial superior a 150 EUR.
- Sin cobertura continua de recepcion.
- Google Calendar o agenda sencilla compatible.
- Dueño o director accesible para configurar y revisar el piloto.

### North Star

`Citas o leads cualificados atribuibles a Atiende360 por clinica activa y semana`.

Metricas complementarias:

- llamadas recuperadas por no respuesta/fuera de horario;
- conversion llamada -> lead -> cita;
- tiempo hasta primer valor;
- errores de reserva y escalados no entregados;
- ingreso potencial recuperado con hipotesis visibles;
- margen bruto por clinica y canal;
- conversion piloto -> pago y retencion D30/D90.

## Mejoras implementadas durante esta auditoria

### Producto y cliente

- El flujo de voz ya no pide comprar o aportar un numero tecnico. La clinica conserva su numero, elige cuando responde la IA y recibe el codigo MMI de desvio.
- El modo recomendado es `si_no_contestan`: la clinica recibe primero la llamada y la IA entra despues de 20 segundos.
- La interfaz muestra instrucciones de prueba y obliga a recordar `##002#` antes de liberar el canal.
- La demo de chat y voz se identifica expresamente como inteligencia artificial.

### Marketing, pricing y ventas

- El hero se centra en clinicas esteticas y llamadas perdidas, no en una oferta horizontal para cualquier clinica.
- Se eliminaron claims absolutos como "sin perder una sola cita" y "activo en 24h".
- Se retiraron del pricing publico anualidades, multisede, multiusuario, resumenes y add-ons no implementados.
- Pricing y paywall consumen ahora una unica fuente de planes.
- Se elimino el enlace a una calculadora inexistente.
- El formulario de demo ahora guarda el lead, fuente, canales y consentimiento; ya no depende de `mailto:`.
- Se añadio la migracion `017_demo_requests.sql` y un endpoint de captacion con rate limiting en el BFF.

### Seguridad y fiabilidad

- Next se actualizo a 15.5.23 y se forzaron transitivas corregidas. `npm audit` queda en cero vulnerabilidades conocidas.
- `clinica_usuarios` tiene RLS habilitado y forzado; se revoca escritura directa a `anon/authenticated`.
- `webhook_events` queda bajo RLS deny-all para clientes.
- Las funciones `SECURITY DEFINER` fijan `search_path` y restringen permisos.
- Se admite de forma consistente el estado `cancelado` de jobs.
- Meta y Retell fallan cerrados en produccion si faltan secretos de firma.
- El WebSocket Retell queda bloqueado en produccion sin secreto dedicado.
- `/health` devuelve HTTP 503 cuando la base de datos no esta lista.
- Swagger, ReDoc y OpenAPI se desactivan en produccion.
- Google Calendar ya no puede iniciarse con un `clinic_id` publico: pasa por un BFF autenticado, scoped al tenant y un token HMAC de cinco minutos.
- La pagina `/agencia` vuelve a comprobar sesion y superadmin en el servidor, no solo en middleware.

### Privacidad y confianza

- La pagina publica de seguridad ya no muestra un `TODO` interno.
- Se corrigieron claims no demostrados de DPA firmados, Privacy Shield y AES-256.
- Se corrigio la explicacion de brechas: encargado sin dilacion, responsable/autoridad cuando proceda.
- Se corrigieron plazo de derechos, identificacion proporcional, conservacion mercantil y tratamiento de menores.

## Riesgos pendientes priorizados

### Reauditoria de cierre (20-08-2026)

- Supabase restaurado y accesible. Se vinculo el CLI al proyecto de produccion, se ejecuto preflight sin duplicados ni solapes y se aplicaron 017, 018 y 019. El historial remoto coincide con el local.
- `demo_requests` y las columnas de consentimiento SMS existen; `demo_requests` y `webhook_events` rechazan al rol anonimo con HTTP 401.
- Se corrigieron scoping tenant de tools, SSRF, reintentos de webhooks, entrega WhatsApp, activacion fail-closed de canales, doble suscripcion Stripe, citas solapadas y falsos exitos de onboarding.
- Se incorporaron consentimiento de analitica, Pixel/CAPI condicional, atribucion UTM saneada, landing del piloto estetico y CI de backend/dashboard.
- QA responsive: los CTA principales miden 52 px en movil, no existe overflow horizontal y la landing del piloto es publica en middleware.
- Continuan como gates externos: desplegar este snapshot, aportar identidad legal/DPA/EIPD, configurar Stripe de produccion y configurar Pixel/CAPI en el hosting del dashboard.

### P0 — no go-live

1. Desplegar el snapshot auditado y verificar DNS/smoke tests en los dominios publicos. Supabase y migraciones 017-019 ya estan resueltos; falta documentar una prueba periodica de restauracion.
2. Completar identidad legal, Aviso Legal, pedido B2B, DPA art. 28, TOMs, lista de subencargados, transferencias y EIPD.
3. Verificar de forma determinista el aviso IA/privacidad antes del primer audio o texto en todos los canales de produccion.
4. Completar el handoff humano con cola durable, dos destinatarios probados y fallback. El copy ya no promete contacto cuando no hay entrega confirmada.
5. Incorporar OTP/confirmacion explicita para cambios sensibles de agenda. El aislamiento obligatorio por `clinic_id` ya esta corregido.
6. Definir formalmente el proposito previsto: recepcion administrativa, sin triaje, diagnostico, priorizacion clinica ni despacho de emergencias. Obtener memo AI Act/MDR.

### P1 — primeros 30 dias

- Implementar retencion, exportacion, supresion, offboarding y borrado en proveedores.
- Separar recordatorios asistenciales de seguimientos comerciales; añadir opt-out y lista de supresion.
- Persistir webhooks antes de procesar, usar cola/reintentos/DLQ y evitar devolver 200 ante fallo transitorio.
- Añadir limites de bytes/tokens/turnos y rate limiting distribuido por IP, usuario y tenant.
- Cerrar SSRF en crawler y webhooks: revalidar cada redirect, IP privada, DNS, puerto, tamaño y egress.
- Añadir constraints unicos a IDs externos tras limpiar duplicados.
- Hacer idempotente Stripe por `event.id`.
- Sustituir schedulers por proceso por worker/leader lock durable.
- Redactar PII/PHI en logs y hacer auditoria completa de accesos y cambios.
- Crear CI/CD con tests, typecheck, build, audit, secret scan, migraciones y smoke tests.
- Instrumentar embudo comercial y de activacion.
- Añadir soporte contextual, estado de integraciones y runbooks operativos.

### P2 — despues de validar retencion

- Confirmar/cancelar/reprogramar mediante enlace seguro.
- Lista de espera automatica.
- Panel de ROI atribuible.
- CSV import/export.
- Roles propietario, recepcion y solo lectura.
- Integracion Doctoralia/Flowww u otro gestor relevante.
- Programa de partners y caso de exito verificable.
- Pagina de estado, BCP/DR y paquete de confianza.

### P3 — no construir ahora

- Multisede real.
- CRM completo.
- Dental sin PMS.
- Prediccion de no-show.
- Campañas masivas.
- Nuevas verticales.
- Benchmarking entre clinicas.

## Roadmap 30/60/90

### 0-30 dias: activacion segura

- Cerrar P0 externos y legales.
- Validar un numero español y el desvio por no respuesta end-to-end.
- Cinco pruebas obligatorias: FAQ, reserva, cambio, cancelacion y urgencia/handoff.
- Activar cinco design partners de estetica de forma asistida.
- Medir primera llamada, primer lead, primera cita y errores.
- No iniciar el piloto hasta go-live real del primer canal.

Gates: 80% activado en 48 h; 100% supera pruebas; cero citas criticas erroneas; 70% recibe interaccion real en 72 h.

### 31-60 dias: demostrar valor

- Handoff durable y SLA interno.
- Confirmacion/cancelacion segura.
- Panel de llamadas y citas recuperadas.
- Alertas de canal, fallos, uso y cero actividad.
- QA semanal de conversaciones.
- 10-15 clinicas con entrevistas semanales.

Gates: 60% logra cita/lead cualificado en siete dias; 50% de pilotos pasa a pago; 85% activo a D30; error de reserva inferior al 1%.

### 61-90 dias: repetibilidad

- Refinar pricing segun COGS, margen y disposicion a pagar.
- Caso de exito verificable.
- Onboarding y playbook comercial repetibles.
- Exportacion y privacidad self-service.
- Partner de agencia/telefonia.
- 25-40 clinicas pagadoras antes de ampliar verticales.

## Evidencia de validacion local

- Backend: 69 tests pasados.
- TypeScript: `npx tsc --noEmit` sin errores.
- Dashboard: build de produccion completado, 54 rutas generadas.
- Dependencias: `npm audit` con 0 vulnerabilidades.
- `git diff --check`: sin errores de whitespace.
- Supabase remoto: migraciones 017-019 aplicadas y verificadas; tablas internas bloqueadas para `anon`.
- QA movil 390 px: CTA de 52 px, sin overflow y landing del piloto accesible sin autenticacion.

## Fuentes de mercado y regulatorias

- [Comision Europea: obligaciones de transparencia del AI Act](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [Comision Europea: alfabetizacion en IA](https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers)
- [AEPD: EIPD y tratamientos de alto riesgo](https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/10-evaluacion-de-impacto/FAQ-0226-en-que-supuestos-es-necesario-realizar-una-evaluacion-de-impacto)
- [AEPD: exactitud y minimizacion en IA](https://www.aepd.es/prensa-y-comunicacion/notas-de-prensa/aepd-analiza-calidad-exactitud-y-minimizacion-de-datos-personales-en-tratamientos-con-ia)
- [BOE: Ley de Servicios de la Sociedad de la Informacion](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758)
- [Observatorio IDIS 2026](https://www.fundacionidis.com/uploads/informes/INFOG._Observatorio_IDIS_2026_20260430.pdf)
- [Doctoralia Phone](https://pro.doctoralia.es/productos/otros-productos/doctoralia-phone/clientes)
- [Booksy: precios y agenda](https://biz.booksy.com/es-es/precios)
- [OpenAI: controles de datos de la API](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)
- [Comision Europea: EU-US Data Privacy Framework](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/eu-us-data-transfers_en)
