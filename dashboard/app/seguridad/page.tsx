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
              <h2>Controles antes de activar una clinica</h2>
              <p>
                La activacion es asistida: primero se comprueba la informacion que puede usar la IA,
                los limites de la agenda y el camino de derivacion a una persona.
              </p>
              <ul>
                <li>El primer mensaje informa de que el paciente interactua con una IA.</li>
                <li>Se prueban preguntas frecuentes, reserva, cambio, cancelacion y derivacion sensible.</li>
                <li>La clinica valida servicios, horarios, precios y reglas antes de recibir contactos reales.</li>
                <li>Se documentan proveedores, instrucciones de tratamiento y periodos de conservacion aplicables.</li>
                <li>Se mantiene siempre un canal humano para incidencias, urgencias y respuestas ambiguas.</li>
              </ul>
            </div>

            <div className={styles.finalCtaCardAlt} style={{ marginTop: 28 }}>
              <p className={styles.finalKickerAlt}>Transparencia</p>
              <h2>La IA se ocupa de recepcion; el criterio clinico sigue siendo humano.</h2>
              <p>
                Atiende360 no diagnostica, prescribe ni sustituye la atencion sanitaria. Si una consulta
                supera las reglas configuradas, registra el contexto y la deriva al equipo de la clinica.
              </p>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
