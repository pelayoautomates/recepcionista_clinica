"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./MarketingStyles.module.css";
import { NAV_ITEMS } from "@/lib/marketing-content";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        )}
      </button>

      {open && (
        <div className={styles.mobileNavOverlay} onClick={() => setOpen(false)}>
          <nav className={styles.mobileNavPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.mobileNavTop}>
              <span className={styles.mobileNavBrand}>Atiende360</span>
              <button onClick={() => setOpen(false)} className={styles.mobileNavClose} aria-label="Cerrar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 3l14 14M17 3L3 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} className={styles.mobileNavItem} onClick={() => setOpen(false)} prefetch={false}>
                {item.label}
              </Link>
            ))}
            <div className={styles.mobileNavActions}>
              <Link href="/#demo" className={styles.btnSecondary} onClick={() => setOpen(false)} prefetch={false} style={{ textAlign: "center" }}>
                Probar demo gratis
              </Link>
              <Link href="/demo" className={styles.btnPrimary} onClick={() => setOpen(false)} prefetch={false} style={{ textAlign: "center" }}>
                Pedir demo guiada
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
