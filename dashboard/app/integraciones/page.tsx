import type { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import {
  SiWhatsapp,
  SiGooglecalendar,
  SiOpenai,
  SiStripe,
  SiMeta,
} from "react-icons/si";
import { HiPhone } from "react-icons/hi2";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Integraciones: Google Calendar y WhatsApp",
  description:
    "Integraciones y canales de Atiende360: Google Calendar, WhatsApp Business API oficial de Meta, telefonía SIP, OpenAI y Stripe.",
  alternates: { canonical: "/integraciones" },
  openGraph: {
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Atiende360, recepcionista IA para clínicas privadas" }],
    title: "Integraciones de Atiende360 | Google Calendar, WhatsApp y telefonía",
    description:
      "Canales e integraciones para recepcionista IA en clínicas privadas.",
    url: "/integraciones",
    type: "article",
  },
};

const INTEGRACIONES = [
  {
    Icon: SiWhatsapp,
    color: "#25D366",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    name: "WhatsApp Business API",
    badge: "Meta oficial",
    badgeColor: "#15803d",
    description:
      "Canal de mensajería conectado directamente con la API oficial de WhatsApp Business de Meta. La clínica vincula su propio número desde el panel mediante Meta Embedded Signup — sin intermediarios ni costes adicionales de BSP.",
  },
  {
    Icon: SiGooglecalendar,
    color: "#4285F4",
    bg: "#eff6ff",
    border: "#bfdbfe",
    name: "Google Calendar",
    badge: "Google Workspace",
    badgeColor: "#1d4ed8",
    description:
      "Sincronización bidireccional con la agenda de Google Calendar de la clínica. El agente consulta disponibilidad en tiempo real y crea, modifica o cancela eventos directamente sin salir del flujo de conversación.",
  },
  {
    Icon: SiOpenai,
    color: "#10a37f",
    bg: "#f0fdf9",
    border: "#99f6e4",
    name: "GPT-4o",
    badge: "OpenAI",
    badgeColor: "#0f766e",
    description:
      "Motor de inteligencia artificial que entiende las conversaciones, toma decisiones y ejecuta herramientas (citas, leads, escalado a humano). Transcripción de audio con Whisper para mensajes de voz en WhatsApp y llamadas.",
  },
  {
    Icon: HiPhone,
    color: "#00C2A8",
    bg: "#f0fdfa",
    border: "#99f6e4",
    name: "Telnyx",
    badge: "Telefonía SIP",
    badgeColor: "#0f766e",
    description:
      "Proveedor de numeración telefónica para el canal de voz IA. La activación se completa cuando el número, el SIP y el agente han superado una prueba de llamada. Puede usarse también para SMS transaccional.",
  },
  {
    Icon: SiStripe,
    color: "#635BFF",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    name: "Stripe",
    badge: "Pagos seguros",
    badgeColor: "#4f46e5",
    description:
      "Infraestructura preparada para suscripciones y facturación cuando el cobro online esté habilitado. Durante el piloto, la contratación y activación se confirman de forma asistida.",
  },
  {
    Icon: SiMeta,
    color: "#0866FF",
    bg: "#eff6ff",
    border: "#bfdbfe",
    name: "Meta Embedded Signup",
    badge: "Meta for Developers",
    badgeColor: "#1d4ed8",
    description:
      "Flujo oficial de Meta para conectar un número de WhatsApp Business. La activación solo se confirma cuando la cuenta, el número y la suscripción del webhook han sido verificados.",
  },
];

export default function IntegracionesPage() {
  return (
    <MarketingShell active="integraciones">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "@id": `${siteUrl}/integraciones#integrations`,
            name: "Integraciones de Atiende360",
            itemListElement: INTEGRACIONES.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              description: item.description,
            })),
          }),
        }}
      />
      <main>
        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>Tecnología oficial</p>
              <h1>Construido sobre las plataformas que ya conoces</h1>
              <p>
                Sin intermediarios ni servicios de terceros opacos. Cada integración usa la API oficial del proveedor,
                con contratos de encargo de tratamiento RGPD firmados.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}>
              {INTEGRACIONES.map(({ Icon, color, bg, border, name, badge, badgeColor, description }) => (
                <article key={name} style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 52, height: 52,
                      background: bg,
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color,
                      fontSize: 26,
                      flexShrink: 0,
                    }}>
                      <Icon />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{name}</div>
                      <span style={{
                        display: "inline-block",
                        marginTop: 3,
                        fontSize: 11,
                        fontWeight: 600,
                        color: badgeColor,
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: 20,
                        padding: "1px 8px",
                      }}>
                        {badge}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}>
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
