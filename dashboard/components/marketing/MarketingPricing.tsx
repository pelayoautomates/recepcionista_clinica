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
              <h1>Elige el plan que mejor encaja con la recepcion de tu clinica</h1>
              <p>
                Mantienes control total de costes, limites y canales. Sin letra pequena y sin permanencia.
              </p>
              <div className={styles.heroCtaRow}>
                <Link href="/login" className={styles.btnPrimary} prefetch={false}>
                  Probar Atiende360
                </Link>
                <Link href="/#calculadora" className={styles.btnSecondary} prefetch={false}>
                  Calcular impacto
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
              <h2>Si tienes varias sedes o flujos complejos, te ayudamos a disenar el setup ideal.</h2>
              <p>
                Podemos ajustar estrategia de recepcion, reglas de derivacion y plan de despliegue por etapas.
              </p>
              <div className={styles.finalActionRow}>
                <Link href="/login" prefetch={false} className={styles.btnPrimary}>
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
