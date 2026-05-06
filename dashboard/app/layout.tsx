import type { Metadata } from "next";
import ConditionalNav from "@/components/ConditionalNav";

export const metadata: Metadata = {
  title: "Recepcionista IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
        <ConditionalNav />
        {children}
      </body>
    </html>
  );
}
