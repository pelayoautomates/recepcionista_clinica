import type { Metadata } from "next";
import MarketingLanding from "@/components/marketing/MarketingLanding";

export const metadata: Metadata = {
  title: "Agente360 | Recepcionista IA para clinicas",
  description:
    "Agente360 atiende llamadas, chat y leads 24/7 para clinicas dentales, esteticas, fisioterapia y centros sanitarios.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Agente360 | Recepcionista IA para clinicas",
    description:
      "Convierte llamadas perdidas en citas con una recepcionista IA 24/7 orientada a conversion.",
    type: "website",
    url: "/",
  },
};

export default function HomePage() {
  return <MarketingLanding />;
}
