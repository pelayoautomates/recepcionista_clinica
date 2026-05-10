import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

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
    default: "Atiende360 | Recepcionista IA para clinicas",
    template: "%s | Atiende360",
  },
  description:
    "Atiende360 es un software de recepcionista IA para clinicas privadas que atiende llamadas, WhatsApp y webchat, agenda citas y deriva a humano cuando hace falta.",
  authors: [{ name: "Atiende360" }],
  creator: "Atiende360",
  publisher: "Atiende360",
  category: "Software sanitario",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Atiende360 | Recepcionista IA para clinicas",
    description:
      "Recepcionista IA 24/7 para clinicas: llamadas, WhatsApp, webchat, citas y escalado humano.",
  },
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
      </body>
    </html>
  );
}
