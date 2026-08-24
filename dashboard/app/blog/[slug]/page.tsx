import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";
import { getBlogPost, getAllSlugs, BLOG_POSTS, type BlogSection } from "@/lib/blog-posts";
import { CITIES } from "@/lib/geo-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Atiende360, recepcionista IA para clínicas privadas" }],
      title: post.title,
      description: post.description,
      type: "article",
      url: `/blog/${post.slug}`,
      siteName: "Atiende360",
      locale: "es_ES",
      publishedTime: post.date,
      modifiedTime: post.date,
      section: post.category,
      tags: post.keywords,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderSection(section: BlogSection, idx: number) {
  switch (section.type) {
    case "h2":
      return <h2 key={idx}>{section.text}</h2>;
    case "h3":
      return <h3 key={idx}>{section.text}</h3>;
    case "p":
      return <p key={idx}>{section.text}</p>;
    case "ul":
      return (
        <ul key={idx}>
          {section.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx}>
          {section.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "cta":
      return (
        <aside key={idx} className={styles.postCta}>
          <p>¿Quieres ver cómo funcionaría en tu clínica?</p>
          <Link
            href={section.ctaHref || "/demo"}
            className={styles.btnPrimary}
            prefetch={false}
          >
            {section.ctaText}
          </Link>
        </aside>
      );
    default:
      return null;
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const pageUrl = `${siteUrl}/blog/${post.slug}`;
  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  const headings = post.content
    .filter((s) => s.type === "h2" && s.text)
    .map((s) => s.text as string);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${pageUrl}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.date,
        keywords: post.keywords.join(", "),
        articleSection: post.category,
        wordCount: post.content
          .map((s) => (s.text || "") + (s.items || []).join(" "))
          .join(" ")
          .split(/\s+/).length,
        timeRequired: `PT${post.readingTime}M`,
        url: pageUrl,
        inLanguage: "es-ES",
        image: `${siteUrl}/opengraph-image`,
        author: { "@id": `${siteUrl}/#organization` },
        publisher: { "@id": `${siteUrl}/#organization` },
        isPartOf: { "@id": `${siteUrl}/blog#blog` },
        mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
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
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: pageUrl },
        ],
      },
    ],
  };

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
            <Link href="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{post.category}</span>
          </div>
        </nav>

        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.postHeader}>
              <div className={styles.postMeta}>
                <span className={styles.postCategory}>{post.category}</span>
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span>· {post.readingTime} min de lectura</span>
              </div>
              <h1>{post.title}</h1>
              <p className={styles.postLead}>{post.description}</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.postLayout}>
              <article className={styles.postBody}>
                {post.content.map((section, idx) => renderSection(section, idx))}

                <div className={styles.postFooter}>
                  <p>
                    Escrito por el equipo de Atiende360, plataforma de recepción con IA para
                    clínicas privadas.
                  </p>
                  <Link href="/blog" prefetch={false}>
                    ← Ver todos los artículos
                  </Link>
                </div>
              </article>

              <aside className={styles.postAside}>
                {headings.length > 1 && (
                  <div className={styles.postToc}>
                    <h2>En este artículo</h2>
                    <ul>
                      {headings.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={styles.postAsideCta}>
                  <h2>Prueba el agente</h2>
                  <p>
                    Habla con la recepcionista IA con los datos de tu clínica, sin registro.
                  </p>
                  <Link href="/#demo" className={styles.btnPrimary} prefetch={false}>
                    Probar ahora
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className={`${styles.section} ${styles.sectionSoft}`}>
            <div className={styles.container}>
              <div className={styles.sectionHeaderCompact}>
                <h2 className={styles.sectionTitleCompact}>Seguir leyendo</h2>
              </div>
              <div className={styles.featureGrid}>
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className={styles.featureCard}
                    prefetch={false}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <h3>{p.title}</h3>
                    <p>{p.description}</p>
                  </Link>
                ))}
              </div>

              <div className={styles.geoNearbyRow} style={{ marginTop: 26 }}>
                {CITIES.slice(0, 6).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/recepcionista-ia/${c.slug}`}
                    className={styles.geoNearbyChip}
                    prefetch={false}
                  >
                    Recepcionista IA en {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </MarketingShell>
  );
}
