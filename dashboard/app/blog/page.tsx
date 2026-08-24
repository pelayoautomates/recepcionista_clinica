import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import { BLOG_POSTS } from "@/lib/blog-posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Blog: gestión de clínicas y recepción con IA",
  description:
    "Artículos prácticos sobre gestión de citas, reducción de no-shows, automatización de recepción y uso de inteligencia artificial en clínicas privadas.",
  alternates: { canonical: "/blog" },
  openGraph: {
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Atiende360, recepcionista IA para clínicas privadas" }],
    title: "Blog Atiende360 | Gestión de clínicas con IA",
    description:
      "Guías y artículos sobre automatización de recepción, recordatorios, agenda y uso de IA en clínicas privadas.",
    type: "website",
    url: "/blog",
    siteName: "Atiende360",
    locale: "es_ES",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Blog",
      "@id": `${siteUrl}/blog#blog`,
      name: "Blog de Atiende360",
      url: `${siteUrl}/blog`,
      inLanguage: "es-ES",
      description:
        "Artículos sobre gestión de clínicas, recepción con IA y automatización de citas.",
      publisher: { "@id": `${siteUrl}/#organization` },
      blogPost: BLOG_POSTS.map((post) => ({
        "@type": "BlogPosting",
        headline: post.title,
        url: `${siteUrl}/blog/${post.slug}`,
        datePublished: post.date,
        dateModified: post.date,
        description: post.description,
        author: { "@id": `${siteUrl}/#organization` },
      })),
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Atiende360",
      url: siteUrl,
      logo: `${siteUrl}/logo-largo.png`,
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${siteUrl}/blog#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      ],
    },
  ],
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  return (
    <MarketingShell active="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <nav className={styles.breadcrumbBar} aria-label="Migas de pan">
          <div className={styles.container}>
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Blog</span>
          </div>
        </nav>

        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>Recursos</p>
              <h1>Gestión de clínicas y recepción con IA</h1>
              <p>
                Guías prácticas sobre agenda, no-shows, recordatorios y automatización de
                recepción, escritas desde lo que vemos a diario en clínicas privadas.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.postList}>
              {BLOG_POSTS.map((post, i) => (
                <article
                  key={post.slug}
                  className={`${styles.postCard} ${styles.animFadeUp}`}
                  style={{ animationDelay: `${Math.min(i, 6) * 55}ms` }}
                >
                  <Link href={`/blog/${post.slug}`} prefetch={false}>
                    <div className={styles.postMeta}>
                      <span className={styles.postCategory}>{post.category}</span>
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                      <span>· {post.readingTime} min</span>
                    </div>
                    <h2>{post.title}</h2>
                    <p>{post.description}</p>
                    <span className={styles.postCardMore}>Leer artículo →</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sectionDark}>
          <div className={styles.container}>
            <div className={styles.finalCtaCard}>
              <p className={styles.finalKicker}>¿Hablamos?</p>
              <h2>Comprueba cómo funcionaría en tu clínica</h2>
              <p>
                Te mostramos el agente configurado con tus servicios reales, tu horario y tus
                canales actuales.
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
