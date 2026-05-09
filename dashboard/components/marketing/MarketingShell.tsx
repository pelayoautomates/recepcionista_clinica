import Link from "next/link";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import styles from "./MarketingStyles.module.css";
import { NAV_ITEMS } from "@/lib/marketing-content";

const headingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--marketing-font-heading",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--marketing-font-body",
});

export default function MarketingShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: "landing" | "pricing";
}) {
  return (
    <div className={`${styles.root} ${headingFont.variable} ${bodyFont.variable}`}>
      <header className={styles.navWrap}>
        <div className={styles.container}>
          <div className={styles.navInner}>
            <Link href="/landing" className={styles.brandLink} prefetch={false}>
              <span className={styles.brandMark} aria-hidden="true">A360</span>
              <span>
                <strong className={styles.brandName}>Agente360</strong>
                <small className={styles.brandSubtext}>Recepcionista IA para clinicas</small>
              </span>
            </Link>

            <nav className={styles.navList}>
              {NAV_ITEMS.map((item) => {
                const isPricing = item.href === "/pricing";
                const isActive = (active === "pricing" && isPricing) || (active === "landing" && !isPricing);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                    prefetch={false}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className={styles.navActions}>
              <Link href="/login" className={styles.btnGhost} prefetch={false}>Ver flujo real</Link>
              <Link href="/login" className={styles.btnPrimary} prefetch={false}>Activar prueba guiada</Link>
            </div>
          </div>
        </div>
      </header>

      {children}

      <footer className={styles.footerWrap}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <span className={styles.footerBrand}>Agente360</span>
            <p className={styles.footerText}>
              2026 Agente360. Recepcionista IA para clinicas enfocada en conversion medible.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
