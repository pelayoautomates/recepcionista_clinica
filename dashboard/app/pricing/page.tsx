import type { Metadata } from "next";
import MarketingPricing from "@/components/marketing/MarketingPricing";

export const metadata: Metadata = {
  title: "Precios Agente360 | Planes para clinicas",
  description:
    "Consulta planes, limites, add-ons y comparativa de Agente360 para elegir la mejor recepcionista IA para tu clinica.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Precios Agente360 | Planes para clinicas",
    description:
      "Pricing claro de Agente360: Starter, Pro y Growth, con add-ons y FAQ de precios.",
    type: "website",
    url: "/pricing",
  },
};

export default function PricingPage() {
  return <MarketingPricing />;
}
