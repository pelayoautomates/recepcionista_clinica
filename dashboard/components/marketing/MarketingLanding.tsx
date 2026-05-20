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

                <div className={styles.heroMobileTrust}>
                  <span>✓ Sin tarjeta</span>
                  <span>✓ Cancela cuando quieras</span>
                  <span>✓ Activo en 24h</span>
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
                  <div className={styles.flowGrid}>

                    {/* ── Row 1: PACIENTE CONTACTA ── */}
                    <div className={styles.flowGridIcon}>
                      <span className={`${styles.flowIconCircle} ${styles.flowIconWA}`}><WaIcon /></span>
                    </div>
                    <article className={styles.flowCardContact}>
                      <div className={styles.flowKicker}>
                        <span className={`${styles.flowDot} ${styles.flowDotBlue}`} />
                        PACIENTE CONTACTA
                      </div>
                      <div className={styles.flowCardTitle}>WhatsApp, llamada o webchat</div>
                      <div className={styles.flowQuote}>
                        <span className={styles.flowQuoteMark}>&ldquo;</span>
                        <span className={styles.flowQuoteText}>Quiero una cita para esta semana</span>
                      </div>
                    </article>
                    <div />

                    {/* ── Connector 1→2 ── */}
                    <div className={styles.flowConnectorSpace} />
                    <div className={styles.flowConnector} aria-hidden="true">
                      <div className={styles.flowConnectorTrack}>
                        <div className={styles.flowConnectorDot} />
                      </div>
                    </div>
                    <div />

                    {/* ── Row 2: IA EN ACCIÓN ── */}
                    <div className={styles.flowGridIcon}>
                      <span className={`${styles.flowIconCircle} ${styles.flowIconPhone}`}><PhoneIcon /></span>
                    </div>
                    <article className={styles.flowCardAI}>
                      <div className={styles.flowCardAIContent}>
                        <div className={styles.flowKicker}>
                          <span className={`${styles.flowDot} ${styles.flowDotPulse}`} />
                          IA EN ACCIÓN
                        </div>
                        <div className={styles.flowCardAITitle}>Responde y propone hueco</div>
                        <div className={styles.flowCardAITime}>Disponible hoy 18:30 o mañana 10:00</div>
                      </div>
                      <div className={styles.flowCardAIAvatar} aria-hidden="true">
                        <RobotIcon />
                      </div>
                    </article>
                    <div className={styles.flowBadgeCell}>
                      <div className={styles.flowBadgeHuman}>
                        <span className={styles.flowBadgeIcon}><UserIcon /></span>
                        <div>
                          <div className={styles.flowBadgeLabel}>DERIVADO AL EQUIPO</div>
                          <div className={styles.flowBadgeText}>Intervención humana cuando hace falta</div>
                        </div>
                      </div>
                    </div>

                    {/* ── Connector 2→3 ── */}
                    <div className={styles.flowConnectorSpace} />
                    <div className={styles.flowConnector} aria-hidden="true">
                      <div className={styles.flowConnectorTrack}>
                        <div className={`${styles.flowConnectorDot} ${styles.flowConnectorDot2}`} />
                      </div>
                    </div>
                    <div />

                    {/* ── Row 3: CITA CONFIRMADA ── */}
                    <div className={styles.flowGridIcon}>
                      <span className={`${styles.flowIconCircle} ${styles.flowIconChat}`}><ChatIcon /></span>
                    </div>
                    <article className={styles.flowCardConfirm}>
                      <div className={`${styles.flowKicker} ${styles.flowKickerGreen}`}>
                        <span className={`${styles.flowDot} ${styles.flowDotGreen}`} />
                        CITA CONFIRMADA
                      </div>
                      <div className={styles.flowConfirmRow}>
                        <div className={styles.flowCalIcon}><CalendarIcon /></div>
                        <div className={styles.flowConfirmText}>
                          <div className={styles.flowConfirmTitle}>Paciente agendado</div>
                          <div className={styles.flowConfirmSub}>Hoy · 18:30 · Google Calendar</div>
                        </div>
                        <span className={styles.flowCheckCircle}>✓</span>
                      </div>
                    </article>
                    <div />

                  </div>
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

            <div className={styles.processStepsWrap}>
              {PROCESS_STEPS.map((step, i) => (
                <div key={step.title} className={styles.processStep}>
                  <div className={styles.processStepCard}>
                    <div className={styles.processStepNum} style={{
                      background: i === 0 ? "linear-gradient(135deg,#0f4bd9,#17a0d6)" : i === 1 ? "linear-gradient(135deg,#7c3aed,#a78bfa)" : "linear-gradient(135deg,#059669,#34d399)",
                    }}>
                      {i + 1}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0a1733", lineHeight: 1.2, marginBottom: 8 }}>{step.title}</h3>
                    <p style={{ margin: 0, fontSize: 14.5, color: "#4b5563", lineHeight: 1.55 }}>{step.text}</p>
                  </div>
                  {i < PROCESS_STEPS.length - 1 && (
                    <>
                      <div className={styles.processStepArrow}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className={styles.processStepDown}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </>
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

              {/* ── Sidebar ── */}
              <aside style={{ width: 200, background: "white", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                {/* Brand */}
                <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#2563eb 0%,#4f46e5 100%)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                      <path d="M3 13V7.5L9 3.5L15 7.5V13" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
                      <rect x="7" y="8" width="4" height="5" rx="0.75" fill="white" fillOpacity="0.9" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#111827" }}>Recepcionista IA</div>
                    <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500 }}>Clínica Demo</div>
                  </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: "8px 10px" }}>
                  {/* Estadísticas — active */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, background: "#eff6ff", color: "#2563eb", fontWeight: 600, fontSize: 12, marginBottom: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 17 17" fill="none"><path d="M2 13.5L6 8.5L9.5 11L13 5.5L15.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 15H15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                    Estadísticas
                  </div>
                  {/* Conversaciones */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, color: "#6b7280", fontWeight: 500, fontSize: 12, marginBottom: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 17 17" fill="none"><path d="M14 2H3C2.45 2 2 2.45 2 3V11C2 11.55 2.45 12 3 12H5V15L9 12H14C14.55 12 15 11.55 15 11V3C15 2.45 14.55 2 14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                    <span style={{ flex: 1 }}>Conversaciones</span>
                    <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: "#ef4444", color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>3</span>
                  </div>
                  {/* Leads */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, color: "#6b7280", fontWeight: 500, fontSize: 12, marginBottom: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 17 17" fill="none"><circle cx="8.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M2.5 14.5C2.5 11.74 5.19 9.5 8.5 9.5C11.81 9.5 14.5 11.74 14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Leads
                  </div>
                  {/* Citas */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, color: "#6b7280", fontWeight: 500, fontSize: 12, marginBottom: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 17 17" fill="none"><rect x="3.5" y="2.5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M6 2.5V4.5M11 2.5V4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M6 7.5H11M6 10H11M6 12.5H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                    Citas
                  </div>
                  {/* Calendario */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, color: "#6b7280", fontWeight: 500, fontSize: 12, marginBottom: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 17 17" fill="none"><rect x="2" y="3" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M2 7H15M5.5 1.5V4.5M11.5 1.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Calendario
                  </div>

                  <div style={{ margin: "8px 4px 4px", fontSize: 9, fontWeight: 600, color: "#d1d5db", textTransform: "uppercase", letterSpacing: "0.08em" }}>Ajustes</div>

                  {/* Configuración */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, color: "#6b7280", fontWeight: 500, fontSize: 12, marginBottom: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 17 17" fill="none"><path d="M9.6 2.5a1.1 1.1 0 00-2.2 0l-.22 1.15c-.38.1-.74.26-1.07.47l-1.02-.38a1.1 1.1 0 00-1.34 1.34l.38 1.02c-.21.33-.37.69-.47 1.07L2.5 7.4a1.1 1.1 0 000 2.2l1.15.22c.1.38.26.74.47 1.07l-.38 1.02a1.1 1.1 0 001.34 1.34l1.02-.38c.33.21.69.37 1.07.47l.22 1.15a1.1 1.1 0 002.2 0l.22-1.15c.38-.1.74-.26 1.07-.47l1.02.38a1.1 1.1 0 001.34-1.34l-.38-1.02c.21-.33.37-.69.47-1.07l1.15-.22a1.1 1.1 0 000-2.2l-1.15-.22a4 4 0 00-.47-1.07l.38-1.02a1.1 1.1 0 00-1.34-1.34l-1.02.38a4 4 0 00-1.07-.47L9.6 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><circle cx="8.5" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.3" /></svg>
                    Configuración
                  </div>
                  {/* Canales */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, color: "#6b7280", fontWeight: 500, fontSize: 12 }}>
                    <svg width="13" height="13" viewBox="0 0 17 17" fill="none"><circle cx="3.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="13.5" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="13.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5 8.5L12 5M5 8.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                    Canales
                  </div>
                </nav>

                {/* Logout */}
                <div style={{ padding: "10px 14px", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", color: "#9ca3af", fontSize: 12, fontWeight: 500 }}>
                    <svg width="13" height="13" viewBox="0 0 17 17" fill="none"><path d="M6.5 2.5H3C2.45 2.5 2 2.95 2 3.5V13.5C2 14.05 2.45 14.5 3 14.5H6.5M11.5 11.5L15 8.5L11.5 5.5M15 8.5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Cerrar sesión
                  </div>
                </div>
              </aside>

              {/* ── Main content ── */}
              <div style={{ flex: 1, background: "#f9fafb", display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
                {/* Page header */}
                <div style={{ padding: "14px 18px 10px", background: "white", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 6 }}>
                    Panel principal <span style={{ fontSize: 13 }}>✦</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 2 }}>Controla tu recepcionista IA, tus conversaciones y tus citas en un solo lugar.</div>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, padding: "12px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>

                  {/* Metric cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
                    <div style={{ background: "white", borderRadius: 10, border: "1px solid #e5e7eb", padding: "13px 14px" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 9 }}>
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M17 3H3C2.45 3 2 3.45 2 4V13C2 13.55 2.45 14 3 14H6V17.5L10.5 14H17C17.55 14 18 13.55 18 13V4C18 3.45 17.55 3 17 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 3 }}>24</div>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500, marginBottom: 4 }}>Conversaciones hoy</div>
                      <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 9L6 3L10 9" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        +12% vs ayer
                      </div>
                    </div>
                    <div style={{ background: "white", borderRadius: 10, border: "1px solid #e5e7eb", padding: "13px 14px" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#d1fae5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 9 }}>
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="2" y="3.5" width="16" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M2 8.5H18M6.5 1.5V5.5M13.5 1.5V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 3 }}>9</div>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500, marginBottom: 4 }}>Citas agendadas hoy</div>
                      <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 9L6 3L10 9" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        +3% vs ayer
                      </div>
                    </div>
                    <div style={{ background: "white", borderRadius: 10, border: "1px solid #e5e7eb", padding: "13px 14px" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ede9fe", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 9 }}>
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 17C3 13.69 6.13 11 10 11C13.87 11 17 13.69 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 3 }}>7</div>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500, marginBottom: 4 }}>Leads captados hoy</div>
                      <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500 }}>Sin datos de ayer</div>
                    </div>
                  </div>

                  {/* Two-column: conversations + agenda */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 188px", gap: 9 }}>

                    {/* Conversations table */}
                    <div style={{ background: "white", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                      <div style={{ padding: "11px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Conversaciones recientes</div>
                        <div style={{ fontSize: 10.5, color: "#2563eb", fontWeight: 500 }}>Ver todas →</div>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                            {["Paciente","Canal","Estado","Hora"].map(h => (
                              <th key={h} style={{ padding: "6px 11px", textAlign: "left", fontSize: 9, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: "1px solid #f9fafb" }}>
                            <td style={{ padding: "8px 11px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, flexShrink: 0 }}>MA</div>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#111827" }}>María A.</span>
                              </div>
                            </td>
                            <td style={{ padding: "8px 11px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: "50%", background: "#25d366" }}>
                                <svg width="9" height="9" viewBox="0 0 11 11" fill="none"><path d="M5.5 1C3.01 1 1 3.01 1 5.5C1 6.35 1.23 7.14 1.63 7.82L1 10L3.25 9.4C3.91 9.76 4.68 9.97 5.5 9.97C7.99 9.97 10 7.96 10 5.47C10 2.98 7.99 1 5.5 1Z" fill="white" /></svg>
                              </span>
                            </td>
                            <td style={{ padding: "8px 11px" }}>
                              <span style={{ fontSize: 9.5, fontWeight: 600, background: "#dcfce7", color: "#166534", padding: "2px 7px", borderRadius: 20 }}>Activa</span>
                            </td>
                            <td style={{ padding: "8px 11px", fontSize: 10.5, color: "#9ca3af" }}>10:34</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #f9fafb" }}>
                            <td style={{ padding: "8px 11px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fef3c7", color: "#92400e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, flexShrink: 0 }}>JL</div>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#111827" }}>Juan L.</span>
                              </div>
                            </td>
                            <td style={{ padding: "8px 11px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: "50%", background: "#f3f4f6" }}>
                                <svg width="9" height="9" viewBox="0 0 11 11" fill="none"><path d="M2 2.5C2 2.22 2.22 2 2.5 2H3.8L4.5 4L3.7 4.5C4.1 5.4 4.6 5.9 5.5 6.3L6 5.5L8 6.2V7.5C8 7.78 7.78 8 7.5 8C4.46 8 2 5.54 2 2.5Z" fill="#6b7280" /></svg>
                              </span>
                            </td>
                            <td style={{ padding: "8px 11px" }}>
                              <span style={{ fontSize: 9.5, fontWeight: 600, background: "#fef3c7", color: "#92400e", padding: "2px 7px", borderRadius: 20 }}>Pendiente humano</span>
                            </td>
                            <td style={{ padding: "8px 11px", fontSize: 10.5, color: "#9ca3af" }}>10:18</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #f9fafb" }}>
                            <td style={{ padding: "8px 11px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, flexShrink: 0 }}>SR</div>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#111827" }}>Sara R.</span>
                              </div>
                            </td>
                            <td style={{ padding: "8px 11px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: "50%", background: "#dbeafe" }}>
                                <svg width="9" height="9" viewBox="0 0 11 11" fill="none"><path d="M9 1H2C1.45 1 1 1.45 1 2V7.5C1 8.05 1.45 8.5 2 8.5H3.5V10.5L6 8.5H9C9.55 8.5 10 8.05 10 7.5V2C10 1.45 9.55 1 9 1Z" stroke="#2563eb" strokeWidth="1" strokeLinejoin="round" /></svg>
                              </span>
                            </td>
                            <td style={{ padding: "8px 11px" }}>
                              <span style={{ fontSize: 9.5, fontWeight: 600, background: "#f1f5f9", color: "#64748b", padding: "2px 7px", borderRadius: 20 }}>Resuelta</span>
                            </td>
                            <td style={{ padding: "8px 11px", fontSize: 10.5, color: "#9ca3af" }}>09:52</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "8px 11px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#ede9fe", color: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, flexShrink: 0 }}>CP</div>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#111827" }}>Carlos P.</span>
                              </div>
                            </td>
                            <td style={{ padding: "8px 11px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: "50%", background: "#25d366" }}>
                                <svg width="9" height="9" viewBox="0 0 11 11" fill="none"><path d="M5.5 1C3.01 1 1 3.01 1 5.5C1 6.35 1.23 7.14 1.63 7.82L1 10L3.25 9.4C3.91 9.76 4.68 9.97 5.5 9.97C7.99 9.97 10 7.96 10 5.47C10 2.98 7.99 1 5.5 1Z" fill="white" /></svg>
                              </span>
                            </td>
                            <td style={{ padding: "8px 11px" }}>
                              <span style={{ fontSize: 9.5, fontWeight: 600, background: "#dcfce7", color: "#166534", padding: "2px 7px", borderRadius: 20 }}>Activa</span>
                            </td>
                            <td style={{ padding: "8px 11px", fontSize: 10.5, color: "#9ca3af" }}>09:41</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Agenda de hoy */}
                    <div style={{ background: "white", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                      <div style={{ padding: "11px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Agenda de hoy</div>
                        <div style={{ fontSize: 10.5, color: "#2563eb", fontWeight: 500 }}>Ver →</div>
                      </div>
                      <div style={{ padding: "4px 0" }}>
                        {[
                          { hora: "10:30", nombre: "Ana Gómez", tipo: "Limpieza dental", bg: "#dcfce7", col: "#166534", est: "Confirmada" },
                          { hora: "12:00", nombre: "Marcos V.", tipo: "Fisioterapia", bg: "#dcfce7", col: "#166534", est: "Confirmada" },
                          { hora: "14:00", nombre: "Elena S.", tipo: "Revisión", bg: "#fef3c7", col: "#92400e", est: "Pendiente" },
                          { hora: "17:30", nombre: "Pedro M.", tipo: "Estética facial", bg: "#dcfce7", col: "#166534", est: "Confirmada" },
                        ].map((c, i, arr) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: i < arr.length - 1 ? "1px solid #f9fafb" : "none" }}>
                            <div style={{ minWidth: 32, fontSize: 10.5, fontWeight: 700, color: "#2563eb" }}>{c.hora}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nombre}</div>
                              <div style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.tipo}</div>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 600, background: c.bg, color: c.col, padding: "2px 6px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>{c.est}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── MOBILE-ONLY: chat preview (alternativa al panel preview desktop) ─── */}
        <section className={`${styles.section} ${styles.sectionSoft} ${styles.mobileOnly}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>En acción</p>
              <h2 className={styles.sectionTitle}>Así habla con tus pacientes</h2>
              <p className={styles.sectionSubtitle}>
                Natural, rápido y siempre disponible. Agenda citas sin que intervengas.
              </p>
            </div>
            <div className={styles.mobileChatPreview}>
              <div className={styles.mobileChatBubbleBot}>
                <small>Atiende360</small>
                <p>Hola, soy el asistente de Clínica Ejemplo. ¿En qué puedo ayudarte?</p>
              </div>
              <div className={styles.mobileChatBubbleUser}>
                <p>Quiero pedir cita para una limpieza dental</p>
              </div>
              <div className={styles.mobileChatBubbleBot}>
                <small>Atiende360</small>
                <p>Perfecto. Tengo disponible el jueves 22 a las 10:30 o el viernes 23 a las 17:00. ¿Cuál te va mejor?</p>
              </div>
              <div className={styles.mobileChatBubbleUser}>
                <p>El jueves a las 10:30</p>
              </div>
              <div className={styles.mobileChatBubbleBot}>
                <small>Atiende360</small>
                <p>¡Listo! Cita confirmada. Te mando confirmación por WhatsApp ahora mismo.</p>
              </div>
              <div className={styles.mobileChatStats}>
                <span>90 segundos</span>
                <span>Cita agendada</span>
                <span>Sin intervención humana</span>
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

function RobotIcon() {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true">
      <circle cx="27" cy="27" r="25" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.32)" strokeWidth="1.5" />
      <line x1="27" y1="4" x2="27" y2="11" stroke="#3b82f6" strokeWidth="1.5" />
      <circle cx="27" cy="3" r="2.5" fill="#3b82f6" />
      <circle cx="20" cy="26" r="5.5" fill="#3b82f6" opacity="0.88" />
      <circle cx="34" cy="26" r="5.5" fill="#3b82f6" opacity="0.88" />
      <circle cx="21" cy="25" r="2.2" fill="white" />
      <circle cx="35" cy="25" r="2.2" fill="white" />
      <path d="M19 36 Q27 43 35 36" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function WaIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.017.5 3.917 1.38 5.583L.057 23.1a.75.75 0 0 0 .921.921l5.517-1.323A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.852 0-3.6-.49-5.107-1.346l-.366-.21-3.793.91.91-3.793-.21-.366A9.722 9.722 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="15" r="1.2" fill="currentColor" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
