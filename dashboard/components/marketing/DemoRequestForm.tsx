"use client";

import { FormEvent, useState } from "react";
import styles from "./MarketingStyles.module.css";

const demoEmail = "hola@atiende360.com";

export default function DemoRequestForm() {
  const [status, setStatus] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const clinic = String(form.get("clinic") || "").trim();
    const website = String(form.get("website") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const specialty = String(form.get("specialty") || "").trim();
    const channels = form.getAll("channels").join(", ");
    const notes = String(form.get("notes") || "").trim();

    const subject = encodeURIComponent(`Demo Atiende360 - ${clinic || "Clinica"}`);
    const body = encodeURIComponent(
      [
        "Hola, quiero solicitar una demo guiada de Atiende360.",
        "",
        `Clinica: ${clinic}`,
        `Web: ${website}`,
        `Email: ${email}`,
        `Telefono: ${phone}`,
        `Tipo de clinica: ${specialty}`,
        `Canales de interes: ${channels}`,
        "",
        `Contexto: ${notes}`,
      ].join("\n")
    );

    setStatus("Se abrira tu cliente de correo con la solicitud preparada.");
    window.location.href = `mailto:${demoEmail}?subject=${subject}&body=${body}`;
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
          <option>Clinica dental</option>
          <option>Clinica estetica</option>
          <option>Fisioterapia o rehabilitacion</option>
          <option>Centro sanitario privado</option>
          <option>Varias sedes</option>
        </select>
      </label>

      <fieldset className={styles.checkboxGroup}>
        <legend>Canales que quieres revisar</legend>
        <label><input type="checkbox" name="channels" value="Telefono IA" /> Telefono IA</label>
        <label><input type="checkbox" name="channels" value="Webchat" /> Webchat</label>
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

      <button type="submit" className={styles.btnPrimarySolid}>
        Enviar solicitud de demo
      </button>
      <p className={styles.formHint}>
        Este formulario prepara un email a {demoEmail}. No se envian datos a terceros desde esta pagina.
      </p>
      {status ? <p className={styles.demoNotice}>{status}</p> : null}
    </form>
  );
}
