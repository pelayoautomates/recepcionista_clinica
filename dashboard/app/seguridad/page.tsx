import type { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import { SECURITY_PRINCIPLES } from "@/lib/marketing-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Seguridad y límites de la recepcionista IA",
  description:
    "Como Atiende360 plantea seguridad operativa, derivación humana, minimización de datos y límites clínicos en recepción con IA.",
  alternates: { canonical: "/seguridad" },
  openGraph: {
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Atiende360, recepcionista IA para clínicas privadas" }],
    title: "Seguridad y límites de Atiende360",
    description:
      "Recepcionista IA para clínicas con foco en tareas operativas, trazabilidad y derivación humana.",
    url: "/seguridad",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${siteUrl}/seguridad#webpage`,
  url: `${siteUrl}/seguridad`,
  name: "Seguridad y límites de Atiende360",
  about: ["recepcionista IA", "seguridad operativa", "derivación humana", "software para clínicas"],
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
              <h1>Recepcionista IA con límites claros para clínicas</h1>
              <p>
                Atiende360 no se presenta como sustituto del criterio clínico. Su papel es reducir carga de recepción,
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
              <h2>Controles antes de activar una clínica</h2>
              <p>
                La activación es asistida: primero se comprueba la información que puede usar la IA,
                los límites de la agenda y el camino de derivación a una persona.
              </p>
              <ul>
                <li>El primer mensaje informa de que el paciente interactúa con una IA.</li>
                <li>Se prueban preguntas frecuentes, reserva, cambio, cancelación y derivación sensible.</li>
                <li>La clínica valida servicios, horarios, precios y reglas antes de recibir contactos reales.</li>
                <li>Se documentan proveedores, instrucciones de tratamiento y periodos de conservación aplicables.</li>
                <li>Se mantiene siempre un canal humano para incidencias, urgencias y respuestas ambiguas.</li>
              </ul>
            </div>

            <div className={styles.finalCtaCardAlt} style={{ marginTop: 28 }}>
              <p className={styles.finalKickerAlt}>Transparencia</p>
              <h2>La IA se ocupa de recepción; el criterio clínico sigue siendo humano.</h2>
              <p>
                Atiende360 no diagnostica, prescribe ni sustituye la atención sanitaria. Si una consulta
                supera las reglas configuradas, registra el contexto y la deriva al equipo de la clínica.
              </p>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
