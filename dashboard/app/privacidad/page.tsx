import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad — Atiende360",
  description: "Política de privacidad y protección de datos de Atiende360.",
};

const LAST_UPDATED = "20 de agosto de 2026";
const CONTROLLER_NAME = "Atiende360";
const CONTROLLER_EMAIL = "equipo@atiende360.com";
const CONTACT_EMAIL = "equipo@atiende360.com";

export default function PrivacidadPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9fafb",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      padding: "48px 16px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 32 }}>
            <div style={{
              width: 32, height: 32,
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>A</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Atiende360</span>
          </Link>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
            Política de Privacidad
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
            Última actualización: {LAST_UPDATED}
          </p>
        </div>

        <div style={{ background: "white", borderRadius: 16, padding: "40px 48px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <Section title="1. Responsable del tratamiento">
            <p>
              En cumplimiento del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo (RGPD) y
              de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía
              de los derechos digitales (LOPDGDD), le informamos de que el responsable del tratamiento de
              sus datos personales es:
            </p>
            <ul>
              <li><strong>Denominación:</strong> {CONTROLLER_NAME}</li>
              <li><strong>Correo de contacto:</strong> {CONTROLLER_EMAIL}</li>
              <li><strong>Actividad:</strong> Plataforma SaaS de recepcionista con inteligencia artificial para clínicas y consultas médicas</li>
            </ul>
          </Section>

          <Section title="2. Datos que recopilamos">
            <p>Recopilamos y tratamos las siguientes categorías de datos:</p>

            <SubSection title="2.1 Datos de usuarios de la plataforma (clínicas / profesionales)">
              <ul>
                <li>Nombre y dirección de correo electrónico (recogidos mediante Google OAuth)</li>
                <li>Nombre de la clínica, especialidad, URL web y teléfono de contacto</li>
                <li>Credenciales OAuth de Google Calendar (tokens protegidos mediante cifrado autenticado Fernet)</li>
                <li>Datos de facturación y suscripción (gestionados por Stripe)</li>
                <li>Registros de uso de la plataforma (métricas, logs de actividad)</li>
              </ul>
            </SubSection>

            <SubSection title="2.2 Datos de pacientes (procesados en nombre de la clínica)">
              <p>
                Atiende360 actúa como <strong>encargado del tratamiento</strong> respecto a los datos de los
                pacientes de cada clínica, que es la responsable del tratamiento de dichos datos.
                Los datos de pacientes que podemos procesar incluyen:
              </p>
              <ul>
                <li>Nombre y apellidos</li>
                <li>Número de teléfono</li>
                <li>Dirección de correo electrónico</li>
                <li>Motivo de consulta e historial de conversación con el agente IA</li>
                <li>Fecha y hora de citas médicas</li>
                <li>Transcripciones de mensajes de voz o audio</li>
              </ul>
              <p>
                <strong>Datos de categoría especial (datos de salud):</strong> la información relativa a
                motivos de consulta, diagnósticos o historial clínico tiene la consideración de dato de
                categoría especial conforme al artículo 9 del RGPD. Su tratamiento se basa en el
                consentimiento explícito del paciente y/o en la necesidad para la prestación de asistencia
                sanitaria, según lo establecido en el artículo 9.2.h) del RGPD y el artículo 8 de la LOPDGDD.
              </p>
            </SubSection>
          </Section>

          <Section title="3. Finalidad y base jurídica del tratamiento">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <Th>Finalidad</Th>
                  <Th>Base jurídica</Th>
                </tr>
              </thead>
              <tbody>
                <Tr cols={["Prestación del servicio de recepcionista IA (responder llamadas, WhatsApp, chat)", "Ejecución de contrato (art. 6.1.b RGPD)"]} />
                <Tr cols={["Gestión de citas en Google Calendar del usuario", "Consentimiento explícito (art. 6.1.a RGPD)"]} />
                <Tr cols={["Autenticación y gestión de la cuenta (Google OAuth)", "Ejecución de contrato (art. 6.1.b RGPD)"]} />
                <Tr cols={["Facturación y cobro de suscripciones", "Obligación legal y ejecución de contrato (art. 6.1.b y 6.1.c RGPD)"]} />
                <Tr cols={["Mejora del servicio mediante análisis de uso", "Interés legítimo (art. 6.1.f RGPD)"]} />
                <Tr cols={["Envío de comunicaciones sobre el servicio", "Ejecución de contrato y consentimiento (art. 6.1.a y 6.1.b RGPD)"]} />
                <Tr cols={["Procesamiento de datos de salud de pacientes", "Consentimiento explícito y art. 9.2.h RGPD (asistencia sanitaria)"]} />
              </tbody>
            </table>
          </Section>

          <Section title="4. Procesadores y transferencias internacionales">
            <p>
              Para prestar el servicio, Atiende360 utiliza los siguientes subencargados del tratamiento,
              que pueden intervenir según los canales e integraciones activados. Las condiciones,
              region efectiva y garantías aplicables deben constar en el acuerdo de tratamiento de cada cliente:
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <Th>Proveedor</Th>
                  <Th>Servicio</Th>
                  <Th>Ubicación</Th>
                </tr>
              </thead>
              <tbody>
                <Tr cols={["Supabase (PostgreSQL)", "Base de datos principal", "UE (Frankfurt)"]} />
                <Tr cols={["OpenAI", "Procesamiento de lenguaje natural y voz", "Region y garantía según configuración contractual"]} />
                <Tr cols={["Google LLC", "Google Calendar API y Google OAuth", "Region y garantía según servicio contratado"]} />
                <Tr cols={["Stripe", "Procesamiento de pagos y facturación", "Region y garantía según servicio contratado"]} />
                <Tr cols={["Railway", "Hosting del servidor de aplicaciones", "Region efectiva del proyecto"]} />
                <Tr cols={["Vercel", "Hosting del panel web", "Region y garantía según servicio contratado"]} />
                <Tr cols={["Retell AI", "Procesamiento de llamadas de voz con IA", "Region y garantía según configuración contractual"]} />
                <Tr cols={["Meta Platforms", "Envio y recepción de mensajes WhatsApp", "Region y garantía según servicio contratado"]} />
                <Tr cols={["Telnyx", "Numeración telefónica y SIP", "Region y garantía según servicio contratado"]} />
              </tbody>
            </table>
            <p style={{ marginTop: 12 }}>
              Las transferencias internacionales a países sin decisión de adecuación de la Comisión Europea
              se realizan con las garantías adecuadas previstas en el artículo 46 del RGPD
              (cláusulas contractuales tipo aprobadas por la Comisión Europea).
            </p>
          </Section>

          <Section title="5. Conservación de datos">
            <ul>
              <li><strong>Datos de cuenta:</strong> mientras la cuenta esté activa + 5 años tras la cancelación (obligaciones mercantiles y fiscales)</li>
              <li><strong>Datos de conversaciones y citas:</strong> 2 años desde la última interacción, salvo instrucción contraria de la clínica</li>
              <li><strong>Datos de facturación y documentación mercantil:</strong> durante los plazos legales aplicables; con carácter general, 6 años para documentación mercantil (art. 30 CCom)</li>
              <li><strong>Tokens de Google Calendar:</strong> hasta que el usuario revoque el acceso desde su cuenta de Google o desde el panel</li>
              <li><strong>Logs de seguridad:</strong> 12 meses</li>
            </ul>
          </Section>

          <Section title="6. Derechos de los interesados">
            <p>
              De conformidad con el RGPD y la LOPDGDD, usted tiene derecho a:
            </p>
            <ul>
              <li><strong>Acceso:</strong> conocer qué datos tratamos sobre usted</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
              <li><strong>Supresión (&quot;derecho al olvido&quot;):</strong> solicitar la eliminación de sus datos cuando ya no sean necesarios</li>
              <li><strong>Limitación del tratamiento:</strong> solicitar que suspendamos el tratamiento en determinadas circunstancias</li>
              <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado y legible por máquina</li>
              <li><strong>Oposición:</strong> oponerse al tratamiento basado en interés legítimo</li>
              <li><strong>Retirada del consentimiento:</strong> en cualquier momento, sin que ello afecte a la licitud del tratamiento previo</li>
              <li><strong>No ser objeto de decisiones automatizadas:</strong> derecho a intervención humana en decisiones basadas exclusivamente en tratamiento automatizado</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, envíe un correo a <strong>{CONTROLLER_EMAIL}</strong>
              indicando el derecho que desea ejercer. Solo solicitaremos información adicional para verificar
              la identidad cuando existan dudas razonables, y siempre de forma proporcional.
              Responderemos en el plazo de <strong>un mes</strong>, ampliable en los supuestos previstos por el RGPD.
            </p>
            <p>
              Si considera que el tratamiento de sus datos no es conforme al RGPD, tiene derecho a presentar
              una reclamación ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong>:{" "}
              <a href="https://www.aepd.es" style={{ color: "#2563eb" }}>www.aepd.es</a>
            </p>
          </Section>

          <Section title="7. Seguridad">
            <p>
              Aplicamos medidas técnicas y organizativas adecuadas para garantizar un nivel de seguridad
              apropiado al riesgo, incluyendo:
            </p>
            <ul>
              <li>Cifrado autenticado de tokens OAuth en reposo mediante Fernet</li>
              <li>Comunicaciones cifradas mediante TLS 1.2+ en tránsito</li>
              <li>Acceso a datos restringido mediante claves de API y Row-Level Security (RLS) en base de datos</li>
              <li>Autenticación exclusivamente mediante Google OAuth (sin contraseñas almacenadas)</li>
              <li>Registro de auditoría de accesos y modificaciones</li>
              <li>Aislamiento de datos por clínica (arquitectura multi-tenant)</li>
            </ul>
            <p>
              En caso de violación de seguridad que suponga un riesgo para sus derechos y libertades,
              se gestionara conforme al procedimiento de incidentes aplicable. Cuando proceda, el responsable
              notificara a la autoridad de control en el plazo previsto por el articulo 33 del RGPD y se
              comunicara a los afectados sin dilación indebida en los supuestos del articulo 34.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              Atiende360 utiliza cookies técnicas necesarias para la sesión y la seguridad. Con tu
              consentimiento separado, podemos activar Meta Pixel y Conversions API para medir si una
              campaña genera una solicitud de demo. Esta medición puede incluir identificadores técnicos,
              página de origen y un hash irreversible del correo enviado en el formulario. Puedes rechazarla
              y seguir usando la web, o cambiar la preferencia eliminando las cookies y datos locales del sitio.
            </p>
          </Section>

          <Section title="9. Menores de edad">
            <p>
              El servicio está dirigido exclusivamente a profesionales y entidades del sector sanitario.
              El tratamiento de datos de pacientes menores depende de los servicios de la clínica y de sus
              instrucciones como responsable. Cuando una clínica atienda a menores, deberá configurar el flujo
              aplicable al tutor o representante y limitar los datos a los estrictamente necesarios.
            </p>
          </Section>

          <Section title="10. Cambios en esta política">
            <p>
              Podemos actualizar esta política periódicamente. Le notificaremos cualquier cambio
              material mediante correo electrónico o mediante un aviso destacado en el panel antes
              de que los cambios entren en vigor. La fecha de la última actualización figura al
              inicio de este documento.
            </p>
          </Section>

          <Section title="11. Contacto">
            <p>
              Para cualquier consulta sobre esta política o sobre el tratamiento de sus datos:
            </p>
            <ul>
              <li><strong>Correo:</strong> {CONTROLLER_EMAIL}</li>
              <li><strong>Alternativa:</strong> {CONTACT_EMAIL}</li>
            </ul>
          </Section>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#9ca3af" }}>
          © {new Date().getFullYear()} Atiende360. Todos los derechos reservados.{" "}
          <Link href="/terminos" style={{ color: "#6b7280" }}>Términos de servicio</Link>
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <div style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14.5, fontWeight: 600, color: "#111827" }}>{title}</h3>
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}

function Tr({ cols }: { cols: string[] }) {
  return (
    <tr style={{ borderTop: "1px solid #f3f4f6" }}>
      {cols.map((c, i) => (
        <td key={i} style={{ padding: "10px 14px", fontSize: 13.5, color: "#374151", verticalAlign: "top" }}>{c}</td>
      ))}
    </tr>
  );
}
