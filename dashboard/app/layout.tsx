import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import ConditionalNav from "@/components/ConditionalNav";
import AgencyWrapper from "@/components/AgencyWrapper";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Recepcionista IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body style={{
        margin: 0,
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        background: "#f8fafc",
        color: "#0f172a",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}>
        <ConditionalNav />
        <AgencyWrapper>{children}</AgencyWrapper>
      </body>
    </html>
  );
}
