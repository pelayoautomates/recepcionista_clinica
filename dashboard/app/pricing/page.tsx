import type { Metadata } from "next";
import MarketingPricing from "@/components/marketing/MarketingPricing";

export const metadata: Metadata = {
  title: "Precios Atiende360 | Planes para clinicas",
  description:
    "Consulta planes, limites, add-ons y comparativa de Atiende360 para elegir la mejor recepcionista IA para tu clinica.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Precios Atiende360 | Planes para clinicas",
    description:
      "Pricing claro de Atiende360: Starter, Pro y Growth, con add-ons y FAQ de precios.",
    type: "website",
    url: "/pricing",
  },
};

export default function PricingPage() {
  return <MarketingPricing />;
}
