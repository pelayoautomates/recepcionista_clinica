import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import { ENTITY_TERMS } from "@/lib/marketing-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Sobre Atiende360",
  description:
    "Entidad de producto de Atiende360: software SaaS de recepcionista IA para clinicas privadas en España.",
  alternates: { canonical: "/sobre-atiende360" },
  openGraph: {
    title: "Sobre Atiende360",
    description:
      "Que es Atiende360, para quien es, que hace y que terminos definen su categoria.",
    url: "/sobre-atiende360",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${siteUrl}/sobre-atiende360#about`,
  url: `${siteUrl}/sobre-atiende360`,
  name: "Sobre Atiende360",
  mainEntity: {
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}/#software`,
    name: "Atiende360",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    audience: "Clinicas privadas y centros sanitarios",
  },
};

export default function SobrePage() {
  return (
    <MarketingShell active="sobre">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>Entidad de producto</p>
              <h1>Atiende360 es un SaaS de recepcionista IA para clinicas privadas</h1>
              <p>
                El producto se centra en recepcion, conversion y agenda: atiende contactos, registra leads, propone
                citas y deriva a humano las conversaciones sensibles.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.contentGrid}>
              <article className={styles.contentCard}>
                <h2>Categoria</h2>
                <p>
                  Software SaaS de recepcionista IA, automatizacion de recepcion y gestion operativa de citas para
                  clinicas privadas.
                </p>
              </article>
              <article className={styles.contentCard}>
                <h2>Mercado</h2>
                <p>
                  Clinicas dentales, esteticas, fisioterapia, rehabilitacion y centros sanitarios privados,
                  especialmente en España.
                </p>
              </article>
              <article className={styles.contentCard}>
                <h2>Uso principal</h2>
                <p>
                  Reducir llamadas perdidas, responder mensajes, clasificar leads, gestionar citas y mantener
                  trazabilidad de la recepcion.
                </p>
              </article>
              <article className={styles.contentCard}>
                <h2>Diferenciacion</h2>
                <p>
                  No es un chatbot generico: esta orientado a recepcion clinica, calendario, canales y escalado humano.
                </p>
              </article>
            </div>

            <div className={styles.semanticTerms}>
              {ENTITY_TERMS.map((term) => <span key={term}>{term}</span>)}
            </div>

            <div className={styles.finalActionRow}>
              <Link href="/demo" className={styles.btnPrimary} prefetch={false}>Pedir demo</Link>
              <Link href="/seguridad" className={styles.btnSecondary} prefetch={false}>Ver seguridad</Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
