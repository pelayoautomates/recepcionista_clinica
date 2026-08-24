import Link from "next/link";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import styles from "./MarketingStyles.module.css";
import { NAV_ITEMS } from "@/lib/marketing-content";
import { CITIES } from "@/lib/geo-content";
import MobileNav from "./MobileNav";
import ScrollReveal from "./ScrollReveal";

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
  active:
    | "landing"
    | "pricing"
    | "demo"
    | "seguridad"
    | "integraciones"
    | "sobre"
    | "comparativa"
    | "geo";
}) {
  return (
    <div className={`${styles.root} ${headingFont.variable} ${bodyFont.variable}`}>
      <ScrollReveal selector={`.${styles.animFadeUp}, .${styles.animFadeIn}`} />
      <header className={styles.navWrap}>
        <div className={styles.container}>
          <div className={styles.navInner}>
            <Link href="/" className={styles.brandLink} prefetch={false} aria-label="Atiende360 inicio">
              <span className={styles.brandMark} aria-hidden="true">AT360</span>
              <span>
                <strong className={styles.brandName}>Atiende360</strong>
                <small className={styles.brandSubtext}>Recepcionista IA para clínicas</small>
              </span>
            </Link>

            <nav className={styles.navList}>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  (active === "pricing" && item.href === "/pricing") ||
                  (active === "demo" && item.href === "/demo") ||
                  (active === "seguridad" && item.href === "/seguridad") ||
                  (active === "integraciones" && item.href === "/integraciones");

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
              <Link href="/login" className={styles.btnGhost} prefetch={false}>Acceder</Link>
              <Link href="/demo" className={styles.btnPrimary} prefetch={false}>Pedir demo</Link>
            </div>
            <MobileNav />
          </div>
        </div>
      </header>

      {children}

      <footer className={styles.footerWrap}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerCols}>
              <div className={styles.footerColBrand}>
                <Link href="/sobre-atiende360" className={styles.footerBrand}>Atiende360</Link>
                <p className={styles.footerTagline}>
                  Recepcionista IA para clínicas privadas. Recupera las llamadas que hoy
                  se pierden y las convierte en citas trazables.
                </p>
              </div>

              <nav className={styles.footerCol} aria-label="Producto">
                <h2 className={styles.footerColTitle}>Producto</h2>
                <Link href="/#como-funciona">Cómo funciona</Link>
                <Link href="/#funcionalidades">Funciones</Link>
                <Link href="/pricing">Precios</Link>
                <Link href="/demo">Demo</Link>
                <Link href="/integraciones">Integraciones</Link>
              </nav>

              <nav className={styles.footerCol} aria-label="Recursos">
                <h2 className={styles.footerColTitle}>Recursos</h2>
                <Link href="/blog">Blog</Link>
                <Link href="/seguridad">Seguridad</Link>
                <Link href="/comparativa/chatbot-generico">Comparativa</Link>
                <Link href="/sobre-atiende360">Sobre Atiende360</Link>
                <Link href="/piloto-clinicas-esteticas">Piloto estética</Link>
              </nav>

              <nav className={styles.footerCol} aria-label="Ciudades">
                <h2 className={styles.footerColTitle}>Ciudades</h2>
                {CITIES.slice(0, 6).map((city) => (
                  <Link key={city.slug} href={`/recepcionista-ia/${city.slug}`}>
                    {city.name}
                  </Link>
                ))}
                <Link href="/recepcionista-ia" className={styles.footerColMore}>
                  Ver todas →
                </Link>
              </nav>
            </div>

            <div className={styles.footerBottom}>
              <p>© {new Date().getFullYear()} Atiende360. Todos los derechos reservados.</p>
              <p>
                <Link href="/privacidad">Privacidad</Link>
                {" · "}
                <Link href="/terminos">Términos</Link>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
