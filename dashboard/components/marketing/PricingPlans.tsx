"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./MarketingStyles.module.css";
import {
  ADDONS,
  COMPARISON_ROWS,
  PLANS,
  PRICING_FAQS,
  type PricingPlan,
} from "@/lib/marketing-content";

type Billing = "mensual" | "anual";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function PlanCard({
  plan,
  billing,
}: {
  plan: PricingPlan & { price: number };
  billing: Billing;
}) {
  return (
    <article className={`${styles.planCard} ${plan.id === "pro" ? styles.planRecommended : ""}`}>
      <div className={styles.planTop}>
        <h3>{plan.name}</h3>
        {plan.badge ? <span>{plan.badge}</span> : null}
      </div>

      <p className={styles.planSubtitle}>{plan.subtitle}</p>

      <p className={styles.planPrice}>
        {formatPrice(plan.price)}
        <small>/mes</small>
      </p>

      <p className={styles.planMeta}>{billing === "anual" ? "Facturacion anual" : "Facturacion mensual"}</p>

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
  const [billing, setBilling] = useState<Billing>("mensual");

  const plans = useMemo(
    () =>
      PLANS.map((plan) => ({
        ...plan,
        price: billing === "mensual" ? plan.monthly : plan.annual,
      })),
    [billing]
  );

  return (
    <div>
      <div className={styles.billingToggle} role="tablist" aria-label="Selector de tipo de pago">
        <button
          type="button"
          className={billing === "mensual" ? styles.toggleActive : ""}
          onClick={() => setBilling("mensual")}
        >
          Mensual
        </button>
        <button
          type="button"
          className={billing === "anual" ? styles.toggleActive : ""}
          onClick={() => setBilling("anual")}
        >
          Anual
        </button>
        <small>Descuento activo con pago anual</small>
      </div>

      <div className={styles.planGrid}>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} billing={billing} />
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
          <section className={styles.addonsSection}>
            <div className={styles.sectionHeaderCompact}>
              <p className={styles.sectionKicker}>Add-ons</p>
              <h3 className={styles.sectionTitleCompact}>Activa solo lo que tu clinica necesita</h3>
            </div>
            <div className={styles.addonsGrid}>
              {ADDONS.map((addon) => (
                <article key={addon.name} className={styles.addonCard}>
                  <div className={styles.addonTop}>
                    <h4>{addon.name}</h4>
                    {addon.badge ? <span>{addon.badge}</span> : null}
                  </div>
                  <strong>{addon.price}</strong>
                  <p>{addon.description}</p>
                </article>
              ))}
            </div>
          </section>

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
