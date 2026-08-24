import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import { CITIES, getCity } from "@/lib/geo-content";
import { FEATURE_BENEFITS, LANDING_FAQS, PROCESS_STEPS } from "@/lib/marketing-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ ciudad: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}): Promise<Metadata> {
  const { ciudad } = await params;
  const city = getCity(ciudad);
  if (!city) return {};

  // El sufijo " | Atiende360" son 13 caracteres: mantenemos el <title> por debajo de 60.
  const longTitle = `Recepcionista IA para clínicas ${city.inName}`;
  const title = longTitle.length + 13 <= 60 ? longTitle : `Recepcionista IA ${city.inName}`;
  const description = `Recepcionista IA para clínicas privadas ${city.inName}: recupera llamadas no atendidas, agenda citas y deriva a tu equipo los casos sensibles.`;

  return {
    title,
    description,
    alternates: { canonical: `/recepcionista-ia/${city.slug}` },
    openGraph: {
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Atiende360, recepcionista IA para clínicas privadas" }],
      title: `${title} | Atiende360`,
      description,
      url: `/recepcionista-ia/${city.slug}`,
      type: "website",
      locale: "es_ES",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Atiende360`,
      description,
    },
    other: {
      "geo.region": "ES",
      "geo.placename": city.name,
      "geo.position": `${city.lat};${city.lng}`,
      ICBM: `${city.lat}, ${city.lng}`,
    },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}) {
  const { ciudad } = await params;
  const city = getCity(ciudad);
  if (!city) notFound();

  const pageUrl = `${siteUrl}/recepcionista-ia/${city.slug}`;
  const faqs = [city.localFaq, ...LANDING_FAQS.slice(0, 6)];
  const nearby = CITIES.filter((c) => c.slug !== city.slug).slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `Recepcionista IA para clínicas ${city.inName}`,
        inLanguage: "es-ES",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${pageUrl}#service` },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: "Ciudades",
            item: `${siteUrl}/recepcionista-ia`,
          },
          { "@type": "ListItem", position: 3, name: city.name, item: pageUrl },
        ],
      },
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: `Recepcionista IA para clínicas ${city.inName}`,
        serviceType: "Recepcionista virtual con inteligencia artificial para clínicas",
        description: `Atiende360 atiende llamadas y mensajes no respondidos de clínicas privadas ${city.inName}, agenda citas en su calendario y deriva a personas los casos sensibles.`,
        url: pageUrl,
        provider: { "@id": `${siteUrl}/#organization` },
        areaServed: {
          "@type": "City",
          name: city.name,
          address: {
            "@type": "PostalAddress",
            addressLocality: city.name,
            addressRegion: city.region,
            addressCountry: "ES",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: city.lat,
            longitude: city.lng,
          },
        },
        audience: {
          "@type": "BusinessAudience",
          audienceType: city.sectors.join(", "),
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "EUR",
          lowPrice: "99",
          highPrice: "299",
          offerCount: 3,
          url: `${siteUrl}/pricing`,
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <MarketingShell active="geo">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <nav className={styles.breadcrumbBar} aria-label="Migas de pan">
          <div className={styles.container}>
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link href="/recepcionista-ia">Ciudades</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{city.name}</span>
          </div>
        </nav>

        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>
                {city.region} · {city.province}
              </p>
              <h1>Recepcionista IA para clínicas {city.inName}</h1>
              <p>
                Cuando tu recepción {city.inName} no puede coger el teléfono, Atiende360
                responde con el contexto de tu clínica, propone huecos reales de tu agenda y
                avisa a tu equipo en cuanto la conversación se vuelve delicada. Conservas tu
                número de siempre.
              </p>
              <div className={styles.finalActionRow} style={{ marginTop: 22 }}>
                <Link href="/demo" className={styles.btnPrimary} prefetch={false}>
                  Pedir demo {city.inName}
                </Link>
                <Link href="/#demo" className={styles.btnSecondary} prefetch={false}>
                  Probar el agente ahora
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`}>
          <div className={styles.container}>
            <div className={styles.geoSplit}>
              <div>
                <p className={styles.sectionKicker}>El contexto local</p>
                <h2 className={styles.sectionTitleCompact}>
                  Cómo se pierden las primeras consultas {city.inName}
                </h2>
                <p className={styles.geoParagraph}>{city.context}</p>
                <p className={styles.geoParagraph}>
                  <strong>Patrón horario habitual:</strong> {city.schedule}
                </p>
              </div>
              <aside className={styles.geoFactCard}>
                <h3>Ficha de la plaza</h3>
                <dl>
                  <div>
                    <dt>Comunidad</dt>
                    <dd>{city.region}</dd>
                  </div>
                  <div>
                    <dt>Provincia</dt>
                    <dd>{city.province}</dd>
                  </div>
                  <div>
                    <dt>Códigos postales</dt>
                    <dd>{city.postalPrefix}xxx</dd>
                  </div>
                  <div>
                    <dt>Zonas con más clínicas</dt>
                    <dd>{city.districts.join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Especialidades con más peso</dt>
                    <dd>{city.sectors.join(", ")}</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Qué hace por tu clínica</p>
              <h2 className={styles.sectionTitle}>
                Lo que cubre Atiende360 en una clínica {city.inName}
              </h2>
            </div>
            <div className={styles.featureGrid}>
              {FEATURE_BENEFITS.slice(0, 6).map((item, i) => (
                <article
                  key={item.title}
                  className={`${styles.featureCard} ${styles.animFadeUp}`}
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Activación</p>
              <h2 className={styles.sectionTitle}>Tres pasos, sin obra ni centralita nueva</h2>
            </div>
            <div className={styles.processStepsWrap}>
              {PROCESS_STEPS.map((step, i) => (
                <div key={step.title} className={styles.processStep}>
                  <div className={styles.processStepCard}>
                    <div
                      className={styles.processStepNum}
                      style={{
                        background:
                          i === 0
                            ? "linear-gradient(135deg,#0f4bd9,#17a0d6)"
                            : i === 1
                              ? "linear-gradient(135deg,#7c3aed,#a78bfa)"
                              : "linear-gradient(135deg,#059669,#34d399)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Preguntas frecuentes</p>
              <h2 className={styles.sectionTitle}>Dudas habituales de las clínicas {city.inName}</h2>
            </div>
            <div className={styles.faqGrid}>
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeaderCompact}>
              <h2 className={styles.sectionTitleCompact}>Otras ciudades con cobertura</h2>
            </div>
            <div className={styles.geoNearbyRow}>
              {nearby.map((c) => (
                <Link
                  key={c.slug}
                  href={`/recepcionista-ia/${c.slug}`}
                  className={styles.geoNearbyChip}
                  prefetch={false}
                >
                  {c.name}
                </Link>
              ))}
              <Link href="/recepcionista-ia" className={styles.geoNearbyChip} prefetch={false}>
                Ver todas
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.sectionDark}>
          <div className={styles.container}>
            <div className={styles.finalCtaCard}>
              <p className={styles.finalKicker}>¿Hablamos?</p>
              <h2>Comprueba si Atiende360 encaja con tu clínica {city.inName}</h2>
              <p>
                Te mostramos cómo quedaría configurado con tus servicios reales, tu horario y
                tus canales actuales. Sin permanencia.
              </p>
              <div className={styles.finalActionRow}>
                <Link href="/demo" className={styles.btnPrimarySolid} prefetch={false}>
                  Pedir demo guiada
                </Link>
                <Link href="/pricing" className={styles.btnGhostLight} prefetch={false}>
                  Ver precios
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
