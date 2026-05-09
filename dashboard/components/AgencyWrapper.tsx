"use client";
import { usePathname } from "next/navigation";

export default function AgencyWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullPage =
    pathname === "/" ||
    pathname.startsWith("/panel") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/pricing");

  if (isFullPage) return <>{children}</>;

  return (
    <main style={{
      maxWidth: 1280,
      margin: "0 auto",
      padding: "36px 40px",
      minHeight: "calc(100vh - 58px)",
    }}>
      {children}
    </main>
  );
}
