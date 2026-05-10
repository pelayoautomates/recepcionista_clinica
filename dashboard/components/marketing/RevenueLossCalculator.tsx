"use client";

import { useMemo, useState } from "react";
import styles from "./MarketingStyles.module.css";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RevenueLossCalculator() {
  const [missedCallsWeek, setMissedCallsWeek] = useState(12);
  const [averageTicket, setAverageTicket] = useState(180);
  const [appointmentRate, setAppointmentRate] = useState(32);
  const weeksPerMonth = 4.3;

  const result = useMemo(() => {
    const opportunities = missedCallsWeek * weeksPerMonth;
    const estimatedAppointments = opportunities * (appointmentRate / 100);
    const estimatedLostRevenue = estimatedAppointments * averageTicket;

    return {
      opportunities: Math.round(opportunities),
      estimatedAppointments: Math.round(estimatedAppointments),
      estimatedLostRevenue: Math.round(estimatedLostRevenue),
    };
  }, [missedCallsWeek, averageTicket, appointmentRate, weeksPerMonth]);

  const yearlyLostRevenue = result.estimatedLostRevenue * 12;

  return (
    <div className={styles.calcSplit} aria-label="Calculadora de ingresos potencialmente perdidos">
      <div className={styles.calcPitch}>
        <p className={styles.calcLabel}>Herramienta gratuita - sin email</p>
        <h2 className={styles.calcPitchTitle}>
          Antes de pagar nada, calcula cuanto estas perdiendo en llamadas que nadie contesta.
        </h2>
        <p className={styles.calcPitchBody}>
          Modifica 3 datos y veras una estimacion orientativa del impacto mensual y anual.
        </p>
      </div>

      <div className={styles.calcPanel}>
        <p className={styles.calcPanelKicker}>Tu estimacion</p>
        <p className={styles.calcPanelLabel}>Estas perdiendo aproximadamente</p>
        <div className={styles.calcPanelMoneyRow}>
          <strong>{formatEuro(result.estimatedLostRevenue)}</strong>
          <span>/mes</span>
        </div>

        <p className={styles.calcPanelSubtext}>
          Eso son <b>{formatEuro(yearlyLostRevenue)}</b> al ano en clientes que llaman, no contestas y se van.
        </p>

        <div className={styles.calcControlsCompact}>
          <label className={styles.calcControl}>
            <span>Llamadas perdidas por semana</span>
            <strong>{missedCallsWeek}</strong>
            <input
              type="range"
              min={0}
              max={40}
              aria-label="Llamadas perdidas por semana"
              value={missedCallsWeek}
              onChange={(e) => setMissedCallsWeek(clamp(Number(e.target.value), 0, 40))}
            />
          </label>

          <label className={styles.calcControl}>
            <span>Valor medio del tratamiento</span>
            <strong>{formatEuro(averageTicket)}</strong>
            <input
              type="range"
              min={40}
              max={2000}
              step={10}
              aria-label="Valor medio del tratamiento"
              value={averageTicket}
              onChange={(e) => setAverageTicket(clamp(Number(e.target.value), 40, 2000))}
            />
          </label>

          <label className={styles.calcControl}>
            <span>% de llamadas que acaban en cita</span>
            <strong>{appointmentRate}%</strong>
            <input
              type="range"
              min={5}
              max={90}
              step={1}
              aria-label="Porcentaje de llamadas que acaban en cita"
              value={appointmentRate}
              onChange={(e) => setAppointmentRate(clamp(Number(e.target.value), 5, 90))}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
