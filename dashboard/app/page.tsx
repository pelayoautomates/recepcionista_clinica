import type { Metadata } from "next";
import MarketingLanding from "@/components/marketing/MarketingLanding";
import { ENTITY_TERMS, FEATURE_BENEFITS, LANDING_FAQS } from "@/lib/marketing-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Recepcionista IA para clínicas privadas",
  description:
    "Atiende360 es un software de recepcionista IA para clínicas privadas: recupera llamadas no atendidas, agenda citas y deriva casos sensibles a humano.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Atiende360 | Recepcionista IA para clínicas privadas",
    description:
      "Software de recepcionista IA para recuperar llamadas y convertirlas en citas trazables.",
    type: "website",
    url: "/",
    siteName: "Atiende360",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atiende360 | Recepcionista IA para clínicas",
    description:
      "Recupera llamadas no atendidas, agenda citas y deriva a humano cuando hace falta.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Atiende360",
      url: siteUrl,
      email: "hola@atiende360.com",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo-largo.png`,
      },
      image: `${siteUrl}/opengraph-image`,
      areaServed: {
        "@type": "Country",
        name: "España",
      },
      knowsLanguage: ["es-ES", "ca-ES", "en"],
      description:
        "Empresa de software especializada en recepcionista IA para clínicas privadas y centros sanitarios.",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "hola@atiende360.com",
        availableLanguage: ["es"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Atiende360",
      inLanguage: "es",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
    },
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/#webpage`,
      url: siteUrl,
      name: "Recepcionista IA para clínicas privadas",
      isPartOf: {
        "@id": `${siteUrl}/#website`,
      },
      about: {
        "@id": `${siteUrl}/#software`,
      },
      mainEntity: {
        "@id": `${siteUrl}/#software`,
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: "Atiende360",
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "es",
      isAccessibleForFree: false,
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      audience: {
        "@type": "BusinessAudience",
        audienceType:
          "Clínicas dentales, clínicas estéticas, fisioterapia, rehabilitación y centros sanitarios privados",
      },
      description:
        "Software SaaS de recepcionista IA para clínicas que recupera llamadas, registra leads, agenda citas y escala conversaciones sensibles a humanos.",
      featureList: FEATURE_BENEFITS.map((feature) => feature.title),
      keywords: ENTITY_TERMS.join(", "),
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
      "@id": `${siteUrl}/#faq`,
      mainEntity: LANDING_FAQS.slice(0, 10).map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${siteUrl}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: `${siteUrl}/`,
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingLanding />
    </>
  );
}
