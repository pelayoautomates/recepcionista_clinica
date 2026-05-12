import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Servicio — Atiende360",
  description: "Condiciones generales de uso y contratación de Atiende360.",
};

const LAST_UPDATED = "12 de mayo de 2026";
const CONTROLLER_EMAIL = "legal@atiende360.com";

export default function TerminosPage() {
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
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 32 }}>
            <div style={{
              width: 32, height: 32,
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>A</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Atiende360</span>
          </a>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
            Términos de Servicio
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
            Última actualización: {LAST_UPDATED}
          </p>
        </div>

        <div style={{ background: "white", borderRadius: 16, padding: "40px 48px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

          <div style={{
            background: "#fef3c7", border: "1px solid #fde68a",
            borderRadius: 10, padding: "14px 18px", marginBottom: 32,
            fontSize: 13.5, color: "#92400e", lineHeight: 1.6,
          }}>
            Al registrarse y utilizar Atiende360, usted acepta quedar vinculado por estos Términos de Servicio.
            Si no está de acuerdo con alguno de los términos, no debe usar el servicio.
          </div>

          <Section title="1. Descripción del servicio">
            <p>
              Atiende360 es una plataforma SaaS (Software como Servicio) que proporciona a clínicas,
              consultas médicas y profesionales de la salud un recepcionista con inteligencia artificial
              capaz de gestionar llamadas telefónicas, mensajes de WhatsApp y chat web para:
            </p>
            <ul>
              <li>Atender y cualificar pacientes de forma automatizada</li>
              <li>Agendar, modificar y cancelar citas en Google Calendar</li>
              <li>Capturar y gestionar leads de potenciales pacientes</li>
              <li>Enviar recordatorios automáticos de citas</li>
              <li>Escalar conversaciones a personal humano cuando sea necesario</li>
            </ul>
            <p>
              Atiende360 actúa como herramienta de apoyo a la gestión. <strong>No constituye un servicio
              médico, diagnóstico clínico ni consejo sanitario</strong> de ningún tipo.
            </p>
          </Section>

          <Section title="2. Condiciones de acceso y registro">
            <ul>
              <li>El servicio está disponible exclusivamente para empresas, clínicas y profesionales. No está dirigido a consumidores particulares.</li>
              <li>Para registrarse es necesario disponer de una cuenta de Google válida.</li>
              <li>El usuario debe proporcionar información veraz y actualizada durante el registro.</li>
              <li>Cada cuenta corresponde a una clínica o entidad. No está permitido compartir credenciales entre organizaciones distintas.</li>
              <li>El usuario es responsable de mantener la confidencialidad de su cuenta y de todas las actividades realizadas desde ella.</li>
            </ul>
          </Section>

          <Section title="3. Período de prueba y planes de suscripción">
            <SubSection title="3.1 Período de prueba gratuito">
              <p>
                Atiende360 ofrece un período de prueba gratuito de <strong>7 días naturales</strong> desde
                el registro. Durante este período se tiene acceso completo al servicio sin necesidad de
                facilitar datos de pago. Al finalizar el período de prueba, el acceso quedará suspendido
                automáticamente si no se ha contratado un plan de pago.
              </p>
            </SubSection>
            <SubSection title="3.2 Planes de pago">
              <p>
                Los planes de pago y sus precios están publicados en{" "}
                <a href="/pricing" style={{ color: "#2563eb" }}>atiende360.com/pricing</a>. Los precios
                se expresan en euros e incluyen el IVA aplicable cuando corresponda.
              </p>
              <ul>
                <li>La suscripción se renueva automáticamente al inicio de cada período de facturación.</li>
                <li>El pago se procesa mediante Stripe. No almacenamos datos de tarjeta de crédito.</li>
                <li>Los minutos de voz consumidos se acumulan mensualmente y se reinician al inicio de cada período.</li>
                <li>El exceso de minutos sobre el plan contratado puede resultar en la suspensión del canal de voz hasta el siguiente período.</li>
              </ul>
            </SubSection>
            <SubSection title="3.3 Cambios de precio">
              <p>
                Nos reservamos el derecho a modificar los precios con un preaviso mínimo de <strong>30 días</strong>
                mediante notificación por correo electrónico. Los cambios no afectarán al período de
                facturación en curso en el momento de la notificación.
              </p>
            </SubSection>
          </Section>

          <Section title="4. Política de cancelación y reembolsos">
            <ul>
              <li>Puede cancelar su suscripción en cualquier momento desde el portal de cliente (Configuración → Facturación).</li>
              <li>La cancelación tiene efecto al final del período de facturación en curso. No se realizan reembolsos proporcionales por período no utilizado, salvo lo dispuesto en el apartado siguiente.</li>
              <li><strong>Derecho de desistimiento (B2C — si aplica):</strong> si usted es un profesional autónomo que actúa fuera de su actividad profesional, dispone de 14 días naturales desde la contratación para ejercer el derecho de desistimiento sin coste, conforme al Real Decreto Legislativo 1/2007.</li>
              <li>En caso de fallo grave del servicio imputable a Atiende360 que suponga una interrupción superior a 72 horas consecutivas, tendrá derecho a un crédito proporcional al tiempo de inactividad.</li>
            </ul>
          </Section>

          <Section title="5. Uso aceptable">
            <p>El usuario se compromete a no utilizar Atiende360 para:</p>
            <ul>
              <li>Actividades ilegales, fraudulentas o contrarias a la ética profesional sanitaria</li>
              <li>Transmitir spam, mensajes no solicitados o contenido engañoso a pacientes</li>
              <li>Suplantar la identidad de profesionales sanitarios reales</li>
              <li>Recopilar datos de pacientes sin base jurídica legítima conforme al RGPD</li>
              <li>Intentar acceder a datos de otras clínicas o vulnerar los mecanismos de seguridad</li>
              <li>Realizar ingeniería inversa o copiar cualquier componente del servicio</li>
              <li>Revender o sublicenciar el acceso al servicio sin autorización expresa</li>
            </ul>
            <p>
              El incumplimiento de estas condiciones faculta a Atiende360 para suspender o cancelar
              la cuenta de forma inmediata y sin reembolso.
            </p>
          </Section>

          <Section title="6. Responsabilidades del usuario (clínica)">
            <p>El usuario es el único responsable de:</p>
            <ul>
              <li>Obtener el consentimiento informado de los pacientes para el tratamiento de sus datos mediante herramientas de IA, conforme al RGPD y la normativa sanitaria aplicable.</li>
              <li>Informar a los pacientes de que están interactuando con un sistema de inteligencia artificial.</li>
              <li>Revisar y validar la información proporcionada por el agente IA antes de tomar decisiones clínicas.</li>
              <li>Configurar correctamente los horarios, servicios y restricciones del agente para evitar confirmaciones de citas incorrectas.</li>
              <li>Cumplir con la normativa sectorial sanitaria aplicable en su territorio (Ley 41/2002, regulación de historias clínicas, etc.).</li>
              <li>Garantizar que el personal humano supervisa activamente las conversaciones marcadas como "pendiente de humano".</li>
            </ul>
          </Section>

          <Section title="7. Limitación de responsabilidad de Atiende360">
            <p>
              Atiende360 no será responsable, en ningún caso, de:
            </p>
            <ul>
              <li>Errores, omisiones o inexactitudes en las respuestas generadas por la inteligencia artificial</li>
              <li>Citas incorrectamente agendadas, canceladas o reprogramadas debido a configuración inadecuada de la cuenta</li>
              <li>Daños derivados del uso del servicio para fines distintos a los previstos</li>
              <li>Interrupciones del servicio causadas por terceros (Google, OpenAI, operadores de telefonía, etc.)</li>
              <li>Pérdida de datos causada por fuerza mayor o fallo de proveedores de infraestructura</li>
              <li>Decisiones médicas, diagnósticas o terapéuticas tomadas con base en las respuestas del agente IA</li>
            </ul>
            <p>
              La responsabilidad máxima agregada de Atiende360 frente al usuario, por cualquier causa,
              quedará limitada al importe pagado por el usuario durante los <strong>3 meses anteriores</strong>
              al evento que origine la reclamación.
            </p>
          </Section>

          <Section title="8. Disponibilidad del servicio">
            <p>
              Atiende360 se compromete a mantener una disponibilidad del servicio del <strong>99,5% mensual</strong>
              (excluido mantenimiento programado). Las interrupciones planificadas se comunicarán con
              un mínimo de 24 horas de antelación salvo emergencias de seguridad.
            </p>
            <p>
              El servicio se proporciona "tal cual" y "según disponibilidad". No garantizamos que el
              servicio sea ininterrumpido, libre de errores o que los resultados del agente IA sean
              exactos o completos en todo momento.
            </p>
          </Section>

          <Section title="9. Propiedad intelectual">
            <ul>
              <li>Atiende360 es titular de todos los derechos de propiedad intelectual sobre la plataforma, el software, el diseño y la documentación.</li>
              <li>El usuario conserva la titularidad de todos los datos de su clínica y de sus pacientes.</li>
              <li>Al usar el servicio, el usuario concede a Atiende360 una licencia limitada, no exclusiva y revocable para procesar sus datos con la única finalidad de prestar el servicio contratado.</li>
              <li>Atiende360 no utilizará los datos de conversaciones o pacientes para entrenar modelos de IA propios sin el consentimiento expreso del usuario.</li>
            </ul>
          </Section>

          <Section title="10. Confidencialidad">
            <p>
              Ambas partes se comprometen a mantener la confidencialidad de la información intercambiada
              en el marco de la relación contractual. Esta obligación subsistirá durante <strong>5 años</strong>
              tras la finalización del contrato.
            </p>
            <p>
              Atiende360 no venderá, alquilará ni compartirá datos de clientes con terceros con fines
              comerciales propios.
            </p>
          </Section>

          <Section title="11. Tratamiento de datos (Contrato de Encargo)">
            <p>
              En virtud del artículo 28 del RGPD, Atiende360 actúa como <strong>encargado del tratamiento</strong>
              respecto a los datos personales de los pacientes de la clínica. Al aceptar estos términos,
              el usuario (responsable del tratamiento) y Atiende360 (encargado) quedan vinculados por
              las condiciones de encargo del tratamiento descritas en nuestra{" "}
              <a href="/privacidad" style={{ color: "#2563eb" }}>Política de Privacidad</a>, que forma
              parte integrante de estos Términos.
            </p>
            <p>
              Atiende360 se compromete a:
            </p>
            <ul>
              <li>Tratar los datos únicamente según las instrucciones documentadas del responsable</li>
              <li>Garantizar que las personas autorizadas se han comprometido a guardar confidencialidad</li>
              <li>Implementar medidas de seguridad adecuadas (art. 32 RGPD)</li>
              <li>No subcontratar sin autorización previa del responsable, salvo los subencargados ya listados en la Política de Privacidad</li>
              <li>Asistir al responsable en el cumplimiento de derechos de los interesados</li>
              <li>Suprimir o devolver todos los datos al finalizar el contrato</li>
            </ul>
          </Section>

          <Section title="12. Modificación de los términos">
            <p>
              Nos reservamos el derecho a modificar estos Términos en cualquier momento. Los cambios
              materiales se notificarán con al menos <strong>15 días de antelación</strong> mediante
              correo electrónico. El uso continuado del servicio tras la notificación implica la
              aceptación de los nuevos términos. Si no acepta los cambios, puede cancelar su
              suscripción antes de la fecha de entrada en vigor.
            </p>
          </Section>

          <Section title="13. Terminación">
            <p>
              Cualquiera de las partes puede dar por terminado el contrato en los siguientes supuestos:
            </p>
            <ul>
              <li><strong>Por el usuario:</strong> cancelando la suscripción en cualquier momento desde el panel.</li>
              <li><strong>Por Atiende360:</strong> por incumplimiento de estos Términos, con preaviso de 7 días salvo infracciones graves (uso fraudulento, incumplimiento legal), en cuyo caso la cancelación será inmediata.</li>
            </ul>
            <p>
              Tras la terminación, el usuario podrá solicitar una exportación de sus datos durante un
              plazo de <strong>30 días</strong>. Transcurrido dicho plazo, los datos serán eliminados de
              forma segura.
            </p>
          </Section>

          <Section title="14. Ley aplicable y jurisdicción">
            <p>
              Estos Términos se rigen por la legislación española. Para cualquier controversia derivada
              de la interpretación o ejecución de los presentes Términos, las partes, con renuncia a
              cualquier otro fuero que pudiera corresponderles, se someten a la jurisdicción de los
              Juzgados y Tribunales de <strong>Madrid</strong>, salvo que la normativa de protección de
              consumidores establezca otro fuero imperativo.
            </p>
          </Section>

          <Section title="15. Contacto">
            <p>Para cualquier consulta legal o contractual:</p>
            <ul>
              <li><strong>Correo:</strong> {CONTROLLER_EMAIL}</li>
            </ul>
          </Section>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#9ca3af" }}>
          © {new Date().getFullYear()} Atiende360. Todos los derechos reservados.{" "}
          <a href="/privacidad" style={{ color: "#6b7280" }}>Política de Privacidad</a>
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
