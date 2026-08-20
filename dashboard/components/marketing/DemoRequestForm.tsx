"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import styles from "./MarketingStyles.module.css";
import { trackMetaEvent } from "@/components/MarketingAnalytics";

export default function DemoRequestForm() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const clinic = String(form.get("clinic") || "").trim();
    const website = String(form.get("website") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const specialty = String(form.get("specialty") || "").trim();
    const channels = form.getAll("channels").join(", ");
    const notes = String(form.get("notes") || "").trim();

    const params = new URLSearchParams(window.location.search);
    const metaEventId = `lead-${crypto.randomUUID()}`;
    const cookie = Object.fromEntries(document.cookie.split("; ").filter(Boolean).map((part) => {
      const [key, ...value] = part.split("=");
      return [key, decodeURIComponent(value.join("="))];
    }));

    try {
      const response = await fetch("/api/demo/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_name: clinic,
          website,
          email,
          phone,
          specialty,
          channels: channels ? channels.split(", ") : [],
          notes,
          privacy_accepted: form.get("privacy") === "on",
          source: params.get("utm_source") || params.get("source") || "website",
          attribution: {
            utm_source: params.get("utm_source"),
            utm_medium: params.get("utm_medium"),
            utm_campaign: params.get("utm_campaign"),
            utm_content: params.get("utm_content"),
            utm_term: params.get("utm_term"),
            fbclid: params.get("fbclid"),
            fbc: cookie._fbc || null,
            fbp: cookie._fbp || null,
            landing_page: `${window.location.origin}${window.location.pathname}`,
            referrer: document.referrer ? (() => {
              try { const value = new URL(document.referrer); return `${value.origin}${value.pathname}`; }
              catch { return null; }
            })() : null,
          },
          meta_event_id: metaEventId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "No se pudo enviar la solicitud");
      trackMetaEvent("Lead", metaEventId);
      setStatus("Solicitud recibida. Te contactaremos para preparar una demo con la operativa de tu clinica.");
      formElement.reset();
    } catch (e: any) {
      setError(e.message || "No se pudo enviar la solicitud. Escribe a hola@atiende360.com.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <div className={styles.fieldGrid}>
        <label className={styles.formField}>
          Nombre de la clinica
          <input name="clinic" type="text" autoComplete="organization" required />
        </label>
        <label className={styles.formField}>
          Web de la clinica
          <input name="website" type="url" inputMode="url" placeholder="https://..." />
        </label>
        <label className={styles.formField}>
          Email de contacto
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className={styles.formField}>
          Telefono
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
      </div>

      <label className={styles.formField}>
        Tipo de clinica
        <select name="specialty" defaultValue="">
          <option value="" disabled>Selecciona una opcion</option>
          <option>Clinica estetica</option>
          <option>Fisioterapia o rehabilitacion</option>
          <option>Psicologia</option>
          <option>Centro sanitario privado</option>
        </select>
      </label>

      <fieldset className={styles.checkboxGroup}>
        <legend>Canales que quieres revisar</legend>
        <label><input type="checkbox" name="channels" value="Telefono IA" /> Telefono IA</label>
        <label><input type="checkbox" name="channels" value="WhatsApp" /> WhatsApp</label>
        <label><input type="checkbox" name="channels" value="Google Calendar" /> Google Calendar</label>
      </fieldset>

      <label className={styles.formField}>
        Que quieres mejorar en recepcion?
        <textarea
          name="notes"
          rows={5}
          placeholder="Ejemplo: perdemos llamadas fuera de horario, queremos sincronizar agenda o necesitamos filtrar primeras consultas."
        />
      </label>

      <label className={styles.formField} style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
        <input name="privacy" type="checkbox" required style={{ marginTop: 3 }} />
        <span>
          He leido la <Link href="/privacidad">politica de privacidad</Link> y acepto que me contacten para gestionar esta solicitud.
        </span>
      </label>

      <button type="submit" className={styles.btnPrimarySolid} disabled={loading}>
        {loading ? "Enviando..." : "Enviar solicitud de demo"}
      </button>
      <p className={styles.formHint}>
        Usaremos estos datos unicamente para preparar la demo y dar seguimiento a tu solicitud.
      </p>
      {status ? <p className={styles.demoNotice} role="status">{status}</p> : null}
      {error ? <p className={styles.demoNotice} role="alert">{error}</p> : null}
    </form>
  );
}
