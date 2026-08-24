import Link from "next/link";
import MarketingShell from "./MarketingShell";
import PricingPlans from "./PricingPlans";
import styles from "./MarketingStyles.module.css";

export default function MarketingPricing() {
  return (
    <MarketingShell active="pricing">
      <main>
        <section className={styles.pricingHero}>
          <div className={styles.container}>
            <div className={styles.pricingHeroInner}>
              <p className={styles.sectionKicker}>Pricing de Atiende360</p>
              <h1>Elige el plan que mejor encaja con la recepción de tu clínica</h1>
              <p>
                Planes mensuales, IVA no incluido y sin permanencia. Los canales opcionales se confirman antes de activar.
              </p>
              <div className={styles.heroCtaRow}>
                <Link href="/demo" className={styles.btnPrimary} prefetch={false}>
                  Probar Atiende360
                </Link>
                <Link href="/#como-funciona" className={styles.btnSecondary} prefetch={false}>
                  Ver como funciona
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <PricingPlans variant="full" />
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`}>
          <div className={styles.container}>
            <div className={styles.finalCtaCardAlt}>
              <p className={styles.finalKickerAlt}>Necesitas una propuesta a medida?</p>
              <h2>Si tienes varias sedes o flujos complejos, te ayudamos a diseñar el setup ideal.</h2>
              <p>
                Podemos ajustar estrategia de recepción, reglas de derivación y plan de despliegue por etapas.
              </p>
              <div className={styles.finalActionRow}>
                <Link href="/demo" prefetch={false} className={styles.btnPrimary}>
                  Solicitar demo consultiva
                </Link>
                <Link href="/" prefetch={false} className={styles.btnGhost}>
                  Volver a landing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
