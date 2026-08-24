import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import MarketingAnalytics from "@/components/MarketingAnalytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Atiende360",
  title: {
    default: "Atiende360 | Recepcionista IA para clínicas",
    template: "%s | Atiende360",
  },
  description:
    "Atiende360 es un software de recepcionista IA para clínicas privadas que recupera llamadas no atendidas, ayuda a agendar citas y deriva a humano cuando hace falta.",
  authors: [{ name: "Atiende360" }],
  creator: "Atiende360",
  publisher: "Atiende360",
  category: "Software sanitario",
  keywords: [
    "recepcionista IA",
    "recepcionista virtual para clínicas",
    "software de recepción para clínicas",
    "agente de voz para clínicas",
    "llamadas no atendidas clínica",
    "agenda de citas con IA",
    "WhatsApp para clínicas",
    "atención al paciente automatizada",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "es-ES": "/",
      "x-default": "/",
    },
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    siteName: "Atiende360",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Atiende360, recepcionista IA para clínicas privadas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Atiende360 | Recepcionista IA para clínicas",
    description:
      "Recepcionista IA para clínicas: llamadas no atendidas, citas y escalado humano.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#0f4bd9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable} suppressHydrationWarning>
      <body style={{
        margin: 0,
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        background: "#f8fafc",
        color: "#0f172a",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}>
        {children}
        <MarketingAnalytics />
      </body>
    </html>
  );
}
