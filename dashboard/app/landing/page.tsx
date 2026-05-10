import type { Metadata } from "next";
import MarketingLanding from "@/components/marketing/MarketingLanding";

export const metadata: Metadata = {
  title: "Atiende360 | Recepcionista IA para clinicas",
  description:
    "Atiende360 atiende llamadas, chat y leads 24/7 para clinicas dentales, esteticas, fisioterapia y centros sanitarios.",
  alternates: {
    canonical: "/landing",
  },
  openGraph: {
    title: "Atiende360 | Recepcionista IA para clinicas",
    description:
      "Convierte llamadas perdidas en citas con una recepcionista IA 24/7 orientada a conversion.",
    type: "website",
    url: "/landing",
  },
};

export default function LandingPage() {
  return <MarketingLanding />;
}
