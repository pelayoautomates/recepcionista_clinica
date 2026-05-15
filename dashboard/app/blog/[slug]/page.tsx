import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, getAllSlugs, type BlogSection } from "@/lib/blog-posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

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
    title: `${post.title} | Atiende360`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `${siteUrl}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `${siteUrl}/blog/${post.slug}`,
      siteName: "Atiende360",
      locale: "es_ES",
      publishedTime: post.date,
    },
  };
}

function renderSection(section: BlogSection, idx: number) {
  switch (section.type) {
    case "h2":
      return (
        <h2
          key={idx}
          className="text-xl font-bold text-gray-900 mt-10 mb-3"
        >
          {section.text}
        </h2>
      );
    case "h3":
      return (
        <h3
          key={idx}
          className="text-lg font-semibold text-gray-800 mt-7 mb-2"
        >
          {section.text}
        </h3>
      );
    case "p":
      return (
        <p key={idx} className="text-gray-700 leading-relaxed mb-4">
          {section.text}
        </p>
      );
    case "ul":
      return (
        <ul key={idx} className="list-disc list-inside space-y-2 mb-4 text-gray-700">
          {section.items?.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx} className="list-decimal list-inside space-y-2 mb-4 text-gray-700">
          {section.items?.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      );
    case "cta":
      return (
        <div key={idx} className="my-10 bg-green-50 rounded-xl p-7 text-center">
          <Link
            href={section.ctaHref || "/"}
            className="inline-block bg-green-700 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
          >
            {section.ctaText}
          </Link>
        </div>
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    keywords: post.keywords.join(", "),
    url: `${siteUrl}/blog/${post.slug}`,
    inLanguage: "es",
    author: {
      "@type": "Organization",
      name: "Atiende360",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Atiende360",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${post.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <nav className="mb-8 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-800">
              Atiende360
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-gray-800">
              Blog
            </Link>
            <span>/</span>
            <span className="text-gray-700 truncate max-w-xs">{post.title}</span>
          </nav>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                {post.category}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(post.date).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="text-xs text-gray-400">
                · {post.readingTime} min de lectura
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 leading-snug mb-4">
              {post.title}
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              {post.description}
            </p>
          </header>

          <article className="prose-custom">
            {post.content.map((section, idx) => renderSection(section, idx))}
          </article>

          <footer className="mt-16 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-6">
              Este artículo fue escrito por el equipo de Atiende360, plataforma
              de recepción inteligente para clínicas privadas.
            </p>
            <Link
              href="/blog"
              className="text-sm font-medium text-green-700 hover:underline"
            >
              ← Ver todos los artículos
            </Link>
          </footer>
        </div>
      </main>
    </>
  );
}
