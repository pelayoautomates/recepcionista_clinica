import type { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import { SECURITY_PRINCIPLES } from "@/lib/marketing-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Seguridad y limites de la recepcionista IA",
  description:
    "Como Atiende360 plantea seguridad operativa, derivacion humana, minimizacion de datos y limites clinicos en recepcion con IA.",
  alternates: { canonical: "/seguridad" },
  openGraph: {
    title: "Seguridad y limites de Atiende360",
    description:
      "Recepcionista IA para clinicas con foco en tareas operativas, trazabilidad y derivacion humana.",
    url: "/seguridad",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${siteUrl}/seguridad#webpage`,
  url: `${siteUrl}/seguridad`,
  name: "Seguridad y limites de Atiende360",
  about: ["recepcionista IA", "seguridad operativa", "derivacion humana", "software para clinicas"],
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Seguridad", item: `${siteUrl}/seguridad` },
    ],
  },
};

export default function SeguridadPage() {
  return (
    <MarketingShell active="seguridad">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>Seguridad operativa</p>
              <h1>Recepcionista IA con limites claros para clinicas</h1>
              <p>
                Atiende360 no se presenta como sustituto del criterio clinico. Su papel es reducir carga de recepcion,
                ordenar conversaciones y escalar a personas cuando una consulta lo requiere.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.featureGrid}>
              {SECURITY_PRINCIPLES.map((item) => (
                <article key={item.title} className={styles.featureCard}>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>

            <div className={styles.limitBox}>
              <h2>TODO pendiente para elevar confianza publica</h2>
              <ul>
                <li>Publicar politica de privacidad legal revisada.</li>
                <li>Documentar encargado/responsable de tratamiento cuando aplique.</li>
                <li>Añadir pagina legal cuando esten definidos datos fiscales y entidad juridica.</li>
                <li>Publicar subprocesadores o proveedores si el proyecto lo requiere comercialmente.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
