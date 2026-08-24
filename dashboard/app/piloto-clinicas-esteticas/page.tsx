import type { Metadata } from "next";
import DemoRequestForm from "@/components/marketing/DemoRequestForm";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Piloto para clínicas estéticas",
  description:
    "Prueba Atiende360 en tu clínica estética con tu propio número, tus servicios y tus reglas de derivación, mediante una activación asistida y sin permanencia.",
  alternates: { canonical: "/piloto-clinicas-esteticas" },
  openGraph: {
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Atiende360, recepcionista IA para clínicas privadas" }],
    title: "Piloto de recuperación de llamadas para clínicas estéticas",
    description:
      "Activación asistida sobre tu numeración actual, con tus servicios y tus reglas de derivación.",
    url: "/piloto-clinicas-esteticas",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/piloto-clinicas-esteticas#webpage`,
      url: `${siteUrl}/piloto-clinicas-esteticas`,
      name: "Piloto de recuperación de llamadas para clínicas estéticas",
      inLanguage: "es-ES",
      isPartOf: { "@id": `${siteUrl}/#website` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: "Piloto para clínicas estéticas",
            item: `${siteUrl}/piloto-clinicas-esteticas`,
          },
        ],
      },
    },
    {
      "@type": "Service",
      "@id": `${siteUrl}/piloto-clinicas-esteticas#service`,
      name: "Piloto asistido de recepcionista IA para clínicas estéticas",
      serviceType: "Recuperación de llamadas no atendidas para clínicas estéticas",
      description:
        "Activación asistida de Atiende360 sobre la numeración actual de la clínica, con sus servicios, horarios y reglas de derivación humana.",
      provider: { "@id": `${siteUrl}/#organization` },
      areaServed: { "@type": "Country", name: "España" },
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Clínicas de medicina estética y centros de estética avanzada",
      },
    },
  ],
};

const benefits = [
  ["Conservas tu número", "Configuramos un desvío por no respuesta: tu recepción sigue siendo la primera opción."],
  ["Agenda con tus reglas", "Servicios, horarios, profesionales y casos que siempre deben pasar a una persona."],
  ["Control humano", "Las urgencias y situaciones sensibles se derivan; la IA se identifica desde el primer saludo."],
];

export default function PilotLandingPage() {
  return (
    <MarketingShell active="demo">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>PILOTO PARA CLÍNICAS ESTÉTICAS</p>
              <h1>Recupera las llamadas que tu recepción no puede coger.</h1>
              <p>
                Atiende360 responde cuando nadie llega, agenda primeras valoraciones con tus reglas y deriva los
                casos sensibles. Tu equipo conserva el control y tú conservas tu número.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.featureStrip}>
              {benefits.map(([title, body]) => (
                <article key={title}>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sectionSoft}>
          <div className={styles.container}>
            <div className={styles.contentGrid}>
              <div>
                <p className={styles.sectionKicker}>OFERTA FUNDADORES</p>
                <h2 className={styles.sectionTitle}>Un piloto asistido, no una promesa genérica.</h2>
                <p className={styles.sectionSubtitle}>
                  169 €/mes + IVA, 300 minutos, una sede, agenda interna o Google Calendar y activación asistida.
                  Sin permanencia. Confirmamos contigo los costes de canales antes de conectar nada.
                </p>
                <div className={styles.checkList}>
                  <p>Configuración con los servicios y preguntas reales de tu clínica.</p>
                  <p>Prueba de llamada, reserva, cambio, cancelación y derivación antes de abrir tráfico.</p>
                  <p>Revisión conjunta de resultados y llamadas recuperadas durante el piloto.</p>
                </div>
              </div>
              <DemoRequestForm />
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
