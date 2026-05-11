import Link from "next/link";
import MarketingShell from "./MarketingShell";
import PricingPlans from "./PricingPlans";
import AgentDemoSandbox from "./AgentDemoSandbox";
import styles from "./MarketingStyles.module.css";
import { GoogleCalendarLogo, WhatsAppLogo } from "@/components/BrandLogos";
import { FEATURE_BENEFITS, LANDING_FAQS, PROCESS_STEPS } from "@/lib/marketing-content";

export default function MarketingLanding() {
  return (
    <MarketingShell active="landing">
      {/* Sticky mobile CTA — slide up on load */}
      <div className={styles.stickyMobileCta}>
        <Link href="/#demo" prefetch={false} className={styles.stickyMobileCtaBtn}>
          Probar demo gratis
        </Link>
        <Link href="/demo" prefetch={false} className={styles.stickyMobileCtaBtnSecondary}>
          Pedir demo
        </Link>
      </div>

      <main>
        {/* ─── HERO ─────────────────────────────────────────────────────── */}
        <section className={styles.heroSectionConversion}>
          <div className={styles.container}>
            <div className={styles.heroConversionGrid}>

              <div className={styles.heroConversionCopy}>
                <p className={`${styles.heroKicker} ${styles.animFadeUp}`} style={{ animationDelay: "0ms" }}>
                  RECEPCIONISTA IA PARA CLINICAS PRIVADAS
                </p>
                <h1 className={`${styles.heroConversionTitle} ${styles.animFadeUp}`} style={{ animationDelay: "80ms" }}>
                  Tu clínica atiende 24/7.<br />Sin perder una sola cita.
                </h1>
                <p className={`${styles.heroConversionLead} ${styles.animFadeUp}`} style={{ animationDelay: "160ms" }}>
                  Atiende360 responde llamadas, WhatsApp y webchat, agenda citas y avisa a tu equipo
                  cuando hace falta intervención humana. Todo conectado en un panel.
                </p>

                <div className={`${styles.heroConversionCta} ${styles.animFadeUp}`} style={{ animationDelay: "240ms" }}>
                  <Link href="/onboarding" prefetch={false} className={styles.btnPrimary}>
                    Empezar gratis — 7 días sin tarjeta
                  </Link>
                  <a href="#demo" className={styles.btnSecondary}>
                    Probar ahora
                  </a>
                </div>

                <div className={`${styles.heroBadgeRow} ${styles.animFadeUp}`} style={{ animationDelay: "320ms" }}>
                  <span className={styles.heroBadge}>
                    <PhoneIcon /> Voz 24/7
                  </span>
                  <span className={styles.heroBadge}>
                    <WhatsAppLogo size={15} /> WhatsApp
                  </span>
                  <span className={styles.heroBadge}>
                    <ChatIcon /> Webchat
                  </span>
                  <span className={styles.heroBadge}>
                    <GoogleCalendarLogo size={15} /> Google Calendar
                  </span>
                </div>
              </div>

              <div className={`${styles.heroConversionVisual} ${styles.desktopOnly} ${styles.animFadeIn}`} style={{ animationDelay: "200ms" }}>
                <div className={styles.heroOrbitalGlow} aria-hidden="true" />
                <div className={styles.hero3dStack}>
                  <article className={styles.stackCardMain}>
                    <small>Conversación real</small>
                    <strong>Paciente reserva en 90 segundos</strong>
                    <p>El agente pregunta, propone hueco y confirma. Todo queda en el panel.</p>
                  </article>
                  <article className={styles.stackCardFloatA}>
                    <span>Nuevo lead</span>
                    <b>Cita agendada</b>
                  </article>
                  <article className={styles.stackCardFloatB}>
                    <span>Derivado</span>
                    <b>Al equipo</b>
                  </article>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ─── PROOF NUMBERS ────────────────────────────────────────────── */}
        <section className={`${styles.section} ${styles.sectionSoft} ${styles.proofSection}`}>
          <div className={styles.container}>
            <div className={styles.proofGrid}>
              <article className={styles.animFadeUp}>
                <strong>24/7</strong>
                <p>Atención sin interrupciones</p>
              </article>
              <article className={styles.animFadeUp} style={{ animationDelay: "60ms" }}>
                <strong>3 canales</strong>
                <p>Voz, WhatsApp y webchat</p>
              </article>
              <article className={styles.animFadeUp} style={{ animationDelay: "120ms" }}>
                <strong>&lt;2 min</strong>
                <p>Respuesta media en hora punta</p>
              </article>
              <article className={styles.animFadeUp} style={{ animationDelay: "180ms" }}>
                <strong>7 días gratis</strong>
                <p>Sin tarjeta. Sin compromiso.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ─── DEMO SANDBOX ─────────────────────────────────────────────── */}
        <section className={`${styles.section} ${styles.demoSection}`} id="demo">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Prueba interactiva — sin registro</p>
              <h2 className={styles.sectionTitle}>
                Habla con el agente. Ahora mismo.
              </h2>
              <p className={styles.sectionSubtitle}>
                Escribe la URL de tu clínica o usa la clínica de ejemplo. Ve cómo el agente responde como si fuera un paciente real.
              </p>
            </div>
            <AgentDemoSandbox />
          </div>
        </section>

        {/* ─── HOW IT WORKS ─────────────────────────────────────────────── */}
        <section className={`${styles.section} ${styles.sectionSoft}`} id="como-funciona">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Cómo funciona</p>
              <h2 className={styles.sectionTitle}>Activo en 3 pasos, sin programar nada</h2>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 0, flexWrap: "wrap", justifyContent: "center" }}>
              {PROCESS_STEPS.map((step, i) => (
                <div key={step.title} style={{ display: "flex", alignItems: "flex-start", flex: "1 1 220px", maxWidth: 340, minWidth: 200 }}>
                  <div style={{
                    background: "white",
                    border: "1px solid #d6e0f4",
                    borderRadius: 20,
                    padding: "28px 24px",
                    boxShadow: "0 4px 20px rgba(15,75,217,0.06)",
                    flex: 1,
                    position: "relative",
                  }}>
                    <div style={{
                      width: 52, height: 52,
                      borderRadius: "50%",
                      background: i === 0 ? "linear-gradient(135deg,#0f4bd9,#17a0d6)" : i === 1 ? "linear-gradient(135deg,#7c3aed,#a78bfa)" : "linear-gradient(135deg,#059669,#34d399)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 900, color: "white",
                      marginBottom: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                    }}>
                      {i + 1}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0a1733", lineHeight: 1.2, marginBottom: 8 }}>{step.title}</h3>
                    <p style={{ margin: 0, fontSize: 14.5, color: "#4b5563", lineHeight: 1.55 }}>{step.text}</p>
                  </div>
                  {i < PROCESS_STEPS.length - 1 && (
                    <div style={{ display: "flex", alignItems: "center", paddingTop: 52, color: "#93c5fd", flexShrink: 0, paddingLeft: 8, paddingRight: 8 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─────────────────────────────────────────────────── */}
        <section className={styles.section} id="funcionalidades">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Qué incluye</p>
              <h2 className={styles.sectionTitle}>Todo lo que necesita la recepción de una clínica</h2>
              <p className={styles.sectionSubtitle}>
                Respuesta inmediata, registro automático y panel unificado. Sin herramientas adicionales.
              </p>
            </div>

            <div className={styles.featureGrid}>
              {FEATURE_BENEFITS.slice(0, 6).map((item, i) => (
                <article key={item.title} className={`${styles.featureCard} ${styles.animFadeUp}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PANEL PREVIEW (desktop only) ────────────────────────────── */}
        <section className={`${styles.section} ${styles.sectionSoft} ${styles.desktopOnlySection}`} id="panel-real">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Panel operativo</p>
              <h2 className={styles.sectionTitle}>Un panel para ver todo sin cambiar de herramienta</h2>
              <p className={styles.sectionSubtitle}>
                Conversaciones, leads, citas y calendario en un solo lugar. Tu equipo ve qué pasó y qué toca hacer.
              </p>
            </div>

            <div className={styles.realPanelStage}>
              <aside className={styles.realPanelSidebarFrame}>
                <div className={styles.realPanelBrand}>Atiende360</div>
                <p className={styles.realPanelBrandSub}>Clínica Demo</p>
                <ul>
                  <li>Inicio</li>
                  <li>Conversaciones</li>
                  <li>Leads</li>
                  <li>Citas</li>
                  <li>Calendario</li>
                  <li>Configuración</li>
                </ul>
              </aside>

              <div className={styles.realPanelMainWrap}>
                <div className={styles.realPanelTopbarFrame}>
                  <div className={styles.realPanelTopbarTitle}>
                    <span>Panel principal</span>
                    <b>Recepción digital en tiempo real</b>
                  </div>
                  <div className={styles.panelTopIntegrations}>
                    <span><GoogleCalendarLogo size={16} /> Google Calendar</span>
                    <span><WhatsAppLogo size={16} /> WhatsApp activo</span>
                  </div>
                </div>

                <div className={styles.realPanelMetricsFrame}>
                  <article className={styles.realPanelMetricCard}>
                    <span>Conversaciones hoy</span>
                    <strong>24</strong>
                  </article>
                  <article className={styles.realPanelMetricCard}>
                    <span>Citas agendadas</span>
                    <strong>9</strong>
                  </article>
                  <article className={styles.realPanelMetricCard}>
                    <span>Leads captados</span>
                    <strong>7</strong>
                  </article>
                </div>

                <div className={styles.realPanelCardsFrame}>
                  <article className={styles.realPanelInfoCard}>
                    <h4>Conversación reciente</h4>
                    <p>Paciente: Quiero cita para limpieza esta semana.</p>
                    <p>Atiende360: Tengo hueco el jueves a las 11:30, ¿te encaja?</p>
                  </article>
                  <article className={styles.realPanelInfoCard}>
                    <h4>Agenda de hoy</h4>
                    <p>10:30 — Revisión inicial</p>
                    <p>12:00 — Fisioterapia</p>
                    <p>17:30 — Primera consulta estética</p>
                  </article>
                  <article className={styles.realPanelInfoCard}>
                    <h4>Leads a revisar</h4>
                    <p>3 interesados sin reserva</p>
                    <p>2 casos para llamada humana</p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PRICING ──────────────────────────────────────────────────── */}
        <section className={styles.section} id="pricing">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Precios</p>
              <h2 className={styles.sectionTitle}>Empieza gratis. Paga cuando veas resultados.</h2>
              <p className={styles.sectionSubtitle}>
                Prueba de 7 días sin tarjeta. Si no funciona para tu clínica, no pagas.
              </p>
            </div>
            <PricingPlans variant="landing" />
          </div>
        </section>

        {/* ─── FAQ ──────────────────────────────────────────────────────── */}
        <section className={`${styles.section} ${styles.sectionSoft}`} id="faq">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Preguntas frecuentes</p>
              <h2 className={styles.sectionTitle}>Todo lo que preguntan antes de empezar</h2>
            </div>

            <div className={styles.faqGrid}>
              {LANDING_FAQS.slice(0, 6).map((faq) => (
                <details key={faq.q}>
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ────────────────────────────────────────────────── */}
        <section className={styles.sectionDark}>
          <div className={styles.container}>
            <div className={styles.finalCtaCard}>
              <p className={styles.finalKicker}>¿Hablamos?</p>
              <h2>Comprueba si Atiende360 encaja con tu recepción en 30 minutos.</h2>
              <p>
                Te mostramos cómo quedaría configurado para tu clínica, con tus servicios reales
                y tus canales actuales.
              </p>
              <div className={styles.finalActionRow}>
                <Link href="/demo" prefetch={false} className={styles.btnPrimary}>
                  Pedir demo guiada
                </Link>
                <Link href="/pricing" prefetch={false} className={styles.btnGhostLight}>
                  Ver precios
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.2 3.6h3.4l1.7 4.2-2 1.3a14.2 14.2 0 0 0 6.6 6.6l1.3-2 4.2 1.7v3.4a1.8 1.8 0 0 1-2 1.8C10 20.2 3.8 14 3.4 5.6a1.8 1.8 0 0 1 1.8-2Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
