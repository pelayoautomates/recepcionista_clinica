import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog-posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Blog de Atiende360 | Gestión de clínicas y recepción con IA",
  description:
    "Artículos prácticos sobre gestión de citas, reducción de no-shows, automatización de recepción y uso de inteligencia artificial en clínicas privadas.",
  alternates: { canonical: `${siteUrl}/blog` },
  openGraph: {
    title: "Blog Atiende360 | Gestión de clínicas con IA",
    description:
      "Guías y artículos sobre automatización de recepción, recordatorios, agenda y uso de IA en clínicas privadas.",
    type: "website",
    url: `${siteUrl}/blog`,
    siteName: "Atiende360",
    locale: "es_ES",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": `${siteUrl}/blog`,
  name: "Blog de Atiende360",
  url: `${siteUrl}/blog`,
  description:
    "Artículos sobre gestión de clínicas, recepción con IA y automatización de citas.",
  publisher: {
    "@type": "Organization",
    name: "Atiende360",
    url: siteUrl,
  },
  blogPost: BLOG_POSTS.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    url: `${siteUrl}/blog/${post.slug}`,
    datePublished: post.date,
    description: post.description,
  })),
};

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <header className="mb-12">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block"
            >
              ← Atiende360
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Blog de Atiende360
            </h1>
            <p className="text-gray-600 text-lg">
              Guías prácticas sobre gestión de clínicas, recepción con IA y
              automatización de citas.
            </p>
          </header>

          <ul className="space-y-10">
            {BLOG_POSTS.map((post) => (
              <li key={post.slug}>
                <article>
                  <Link href={`/blog/${post.slug}`} className="group block">
                    <div className="flex items-center gap-3 mb-2">
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
                        · {post.readingTime} min
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-green-700 transition-colors mb-2">
                      {post.title}
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {post.description}
                    </p>
                    <span className="mt-3 inline-block text-sm font-medium text-green-700">
                      Leer artículo →
                    </span>
                  </Link>
                </article>
                <hr className="mt-10 border-gray-100" />
              </li>
            ))}
          </ul>

          <div className="mt-16 bg-green-50 rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              ¿Quieres ver cómo funciona en tu clínica?
            </h2>
            <p className="text-gray-600 mb-5 text-sm">
              Prueba Atiende360 durante 7 días sin tarjeta. Setup en menos de 30
              minutos.
            </p>
            <Link
              href="/onboarding"
              className="inline-block bg-green-700 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
            >
              Empezar prueba gratuita
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
