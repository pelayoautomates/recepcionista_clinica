import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import { CITIES } from "@/lib/geo-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Recepcionista IA para clínicas por ciudad",
  description:
    "Atiende360 da servicio a clínicas privadas de toda España. Elige tu ciudad y descubre cómo recuperar las llamadas que hoy se pierden en tu recepción.",
  alternates: { canonical: "/recepcionista-ia" },
  openGraph: {
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Atiende360, recepcionista IA para clínicas privadas" }],
    title: "Recepcionista IA para clínicas por ciudad | Atiende360",
    description:
      "Cobertura en Madrid, Barcelona, Valencia, Sevilla, Málaga y el resto de España.",
    url: "/recepcionista-ia",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${siteUrl}/recepcionista-ia#webpage`,
      url: `${siteUrl}/recepcionista-ia`,
      name: "Recepcionista IA para clínicas por ciudad",
      inLanguage: "es-ES",
      isPartOf: { "@id": `${siteUrl}/#website` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: "Ciudades",
            item: `${siteUrl}/recepcionista-ia`,
          },
        ],
      },
    },
    {
      "@type": "ItemList",
      "@id": `${siteUrl}/recepcionista-ia#lista`,
      name: "Ciudades con cobertura de Atiende360",
      numberOfItems: CITIES.length,
      itemListElement: CITIES.map((city, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `Recepcionista IA para clínicas en ${city.name}`,
        url: `${siteUrl}/recepcionista-ia/${city.slug}`,
      })),
    },
  ],
};

export default function GeoIndexPage() {
  return (
    <MarketingShell active="geo">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>Cobertura en España</p>
              <h1>Recepcionista IA para clínicas, ciudad a ciudad</h1>
              <p>
                Atiende360 es un servicio en la nube, así que funciona en cualquier clínica de
                España. Lo que cambia de una plaza a otra es el patrón de llamadas: horarios,
                estacionalidad, idioma del paciente y competencia. Elige tu ciudad para ver
                cómo lo planteamos allí.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.geoGrid}>
              {CITIES.map((city, i) => (
                <Link
                  key={city.slug}
                  href={`/recepcionista-ia/${city.slug}`}
                  className={`${styles.geoCard} ${styles.animFadeUp}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                  prefetch={false}
                >
                  <span className={styles.geoCardRegion}>{city.region}</span>
                  <span className={styles.geoCardName}>{city.name}</span>
                  <span className={styles.geoCardSectors}>
                    {city.sectors.slice(0, 3).join(" · ")}
                  </span>
                  <span className={styles.geoCardArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>

            <div className={styles.limitBox} style={{ marginTop: 32 }}>
              <h2>¿Tu ciudad no está en la lista?</h2>
              <p>
                No es un problema de cobertura. Atiende360 no depende de una centralita física:
                se activa por desvío sobre tu numeración actual, funcione donde funcione tu
                clínica. Estas páginas existen porque el contexto local cambia la forma de
                configurar horarios, idiomas y reglas de agenda, no porque el servicio esté
                limitado a unas plazas.
              </p>
              <div className={styles.finalActionRow} style={{ marginTop: 18 }}>
                <Link href="/demo" className={styles.btnPrimary} prefetch={false}>
                  Pedir demo para tu clínica
                </Link>
                <Link href="/pricing" className={styles.btnSecondary} prefetch={false}>
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
