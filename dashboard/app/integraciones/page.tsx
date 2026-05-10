import type { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import { INTEGRATION_BLOCKS } from "@/lib/marketing-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Integraciones de Atiende360",
  description:
    "Integraciones y canales de Atiende360: Google Calendar, calendario interno, telefono IA, webchat, WhatsApp e integraciones personalizadas.",
  alternates: { canonical: "/integraciones" },
  openGraph: {
    title: "Integraciones de Atiende360",
    description:
      "Canales e integraciones para recepcionista IA en clinicas privadas.",
    url: "/integraciones",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": `${siteUrl}/integraciones#integrations`,
  name: "Integraciones de Atiende360",
  itemListElement: INTEGRATION_BLOCKS.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.title,
    description: item.text,
  })),
};

export default function IntegracionesPage() {
  return (
    <MarketingShell active="integraciones">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>Canales e integraciones</p>
              <h1>Integra la recepcion IA con la agenda y los canales de tu clinica</h1>
              <p>
                Atiende360 puede operar con calendario interno, Google Calendar y canales como telefono, webchat o
                WhatsApp segun el plan y la configuracion del centro.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.featureGrid}>
              {INTEGRATION_BLOCKS.map((item) => (
                <article key={item.title} className={styles.featureCard}>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
