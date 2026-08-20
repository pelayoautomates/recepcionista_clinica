"use client";

import Link from "next/link";
import styles from "./MarketingStyles.module.css";
import {
  COMPARISON_ROWS,
  PLANS,
  PRICING_FAQS,
  type PricingPlan,
} from "@/lib/marketing-content";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function PlanCard({
  plan,
}: {
  plan: PricingPlan;
}) {
  return (
    <article className={`${styles.planCard} ${plan.id === "pro" ? styles.planRecommended : ""}`}>
      <div className={styles.planTop}>
        <h3>{plan.name}</h3>
        {plan.badge ? <span>{plan.badge}</span> : null}
      </div>

      <p className={styles.planSubtitle}>{plan.subtitle}</p>

      <p className={styles.planPrice}>
        {formatPrice(plan.monthly)}
        <small>/mes</small>
      </p>

      <p className={styles.planMeta}>Facturacion mensual · IVA no incluido</p>

      <ul className={styles.planList}>
        {plan.features.map((item) => (
          <li key={`${plan.id}-${item}`}>{item}</li>
        ))}
      </ul>

      <Link href="/demo" className={styles.btnPrimary} prefetch={false}>
        {plan.cta}
      </Link>
    </article>
  );
}

export default function PricingPlans({ variant }: { variant: "landing" | "full" }) {
  return (
    <div>
      <div className={styles.planGrid}>
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {variant === "landing" && (
        <div className={styles.pricingCtaRow}>
          <Link href="/pricing" className={styles.btnSecondary} prefetch={false}>
            Ver comparativa completa y add-ons
          </Link>
        </div>
      )}

      {variant === "full" && (
        <>
          <section className={styles.comparisonSection}>
            <div className={styles.sectionHeaderCompact}>
              <p className={styles.sectionKicker}>Comparativa</p>
              <h3 className={styles.sectionTitleCompact}>Starter, Pro y Growth lado a lado</h3>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th>Funcionalidad</th>
                    <th>Starter</th>
                    <th>Pro</th>
                    <th>Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td>{row.starter}</td>
                      <td>{row.pro}</td>
                      <td>{row.growth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.pricingFaqSection}>
            <div className={styles.sectionHeaderCompact}>
              <p className={styles.sectionKicker}>FAQ de precios</p>
              <h3 className={styles.sectionTitleCompact}>Resuelve dudas antes de decidir</h3>
            </div>

            <div className={styles.faqGridCompact}>
              {PRICING_FAQS.map((faq) => (
                <details key={faq.q}>
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
