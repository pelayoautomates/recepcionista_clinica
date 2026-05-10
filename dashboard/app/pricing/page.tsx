import type { Metadata } from "next";
import MarketingPricing from "@/components/marketing/MarketingPricing";
import { PLANS, PRICING_FAQS } from "@/lib/marketing-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Precios de recepcionista IA para clinicas",
  description:
    "Consulta planes, limites, add-ons y comparativa de Atiende360 para elegir un software de recepcionista IA para tu clinica privada.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Precios Atiende360 | Planes de recepcionista IA para clinicas",
    description:
      "Planes Starter, Pro y Growth con minutos, usuarios, sedes, add-ons y FAQ de precios.",
    type: "website",
    url: "/pricing",
    siteName: "Atiende360",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Precios Atiende360",
    description: "Planes y add-ons de recepcionista IA para clinicas privadas.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/pricing#webpage`,
      url: `${siteUrl}/pricing`,
      name: "Precios de Atiende360",
      about: {
        "@id": `${siteUrl}/#software`,
      },
    },
    {
      "@type": "Product",
      "@id": `${siteUrl}/pricing#product`,
      name: "Atiende360",
      category: "Software de recepcionista IA para clinicas",
      description:
        "Planes de Atiende360 para atender llamadas, webchat, WhatsApp, leads y citas en clinicas privadas.",
      brand: {
        "@type": "Brand",
        name: "Atiende360",
      },
      offers: PLANS.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.monthly,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${siteUrl}/pricing`,
        description: plan.subtitle,
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/pricing#faq`,
      mainEntity: PRICING_FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingPricing />
    </>
  );
}
