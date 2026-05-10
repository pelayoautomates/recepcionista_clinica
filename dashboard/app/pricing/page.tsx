import type { Metadata } from "next";
import MarketingPricing from "@/components/marketing/MarketingPricing";

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

export default function PricingPage() {
  return <MarketingPricing />;
}
