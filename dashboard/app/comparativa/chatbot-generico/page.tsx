import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import { GENERIC_COMPARISON } from "@/lib/marketing-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Atiende360 vs chatbot generico para clinicas",
  description:
    "Comparativa entre una recepcionista IA especializada para clinicas y un chatbot generico: agenda, leads, escalado humano y trazabilidad.",
  alternates: { canonical: "/comparativa/chatbot-generico" },
  openGraph: {
    title: "Atiende360 vs chatbot generico",
    description:
      "Por que una clinica necesita recepcion IA con agenda, canales y derivacion humana, no solo respuestas automaticas.",
    url: "/comparativa/chatbot-generico",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${siteUrl}/comparativa/chatbot-generico#webpage`,
  url: `${siteUrl}/comparativa/chatbot-generico`,
  name: "Atiende360 vs chatbot generico para clinicas",
  about: ["recepcionista IA", "chatbot para clinicas", "software de agenda", "automatizacion de recepcion"],
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Comparativa", item: `${siteUrl}/comparativa/chatbot-generico` },
    ],
  },
};

export default function ComparativaChatbotPage() {
  return (
    <MarketingShell active="comparativa">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>Comparativa</p>
              <h1>Atiende360 frente a un chatbot generico para clinicas</h1>
              <p>
                Un chatbot puede contestar preguntas. Una recepcionista IA para clinicas debe trabajar con agenda,
                leads, canales, trazabilidad y criterios de derivacion humana.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.tableWrap}>
              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th>Criterio</th>
                    <th>Chatbot generico</th>
                    <th>Atiende360</th>
                  </tr>
                </thead>
                <tbody>
                  {GENERIC_COMPARISON.map((row) => (
                    <tr key={row.title}>
                      <td>{row.title}</td>
                      <td>{row.generic}</td>
                      <td>{row.atende}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.limitBox}>
              <h2>Cuando basta un chatbot generico</h2>
              <ul>
                <li>Si solo quieres responder preguntas frecuentes sencillas.</li>
                <li>Si no necesitas agenda, leads, llamadas ni seguimiento.</li>
                <li>Si tu equipo puede revisar manualmente cada conversacion.</li>
              </ul>
            </div>

            <div className={styles.finalActionRow}>
              <Link href="/demo" className={styles.btnPrimary} prefetch={false}>Validar mi caso</Link>
              <Link href="/integraciones" className={styles.btnSecondary} prefetch={false}>Ver integraciones</Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
