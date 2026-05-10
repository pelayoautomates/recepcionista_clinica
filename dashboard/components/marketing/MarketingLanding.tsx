import Link from "next/link";
import MarketingShell from "./MarketingShell";
import PricingPlans from "./PricingPlans";
import RevenueLossCalculator from "./RevenueLossCalculator";
import AgentDemoSandbox from "./AgentDemoSandbox";
import styles from "./MarketingStyles.module.css";
import { GoogleCalendarLogo, WhatsAppLogo } from "@/components/BrandLogos";
import {
  FEATURE_BENEFITS,
  HERO_TRUST_POINTS,
  HUMAN_VS_AI_ROWS,
  LANDING_FAQS,
  PROCESS_STEPS,
} from "@/lib/marketing-content";

export default function MarketingLanding() {
  return (
    <MarketingShell active="landing">
      <main>
        <section className={styles.heroSectionConversion}>
          <div className={styles.container}>
            <div className={styles.heroConversionGrid}>
              <div className={styles.heroConversionCopy}>
                <p className={styles.heroKicker}>RECEPCIONISTA IA PARA CLINICAS PRIVADAS</p>
                <h1 className={styles.heroConversionTitle}>
                  Convierte llamadas y mensajes en citas cerradas, incluso fuera de horario.
                </h1>
                <p className={styles.heroConversionLead}>
                  Atiende360 responde al instante por telefono, WhatsApp y webchat, agenda en Google Calendar y
                  escala a humano cuando hace falta. Menos fuga de leads, mas agenda llena.
                </p>

                <div className={styles.heroConversionCta}>
                  <Link href="/login" prefetch={false} className={styles.btnPrimary}>
                    Activar prueba guiada
                  </Link>
                  <a href="#panel-real" className={styles.btnSecondary}>
                    Ver panel real
                  </a>
                </div>

                <p className={styles.offerLine}>
                  Setup asistido + 5 dias de prueba. Cancelacion simple y sin permanencia.
                </p>

                <div className={styles.heroTrustGridCenter}>
                  {HERO_TRUST_POINTS.map((point) => (
                    <span key={point}>{point}</span>
                  ))}
                </div>
              </div>

              <div className={styles.heroConversionVisual}>
                <div className={styles.heroOrbitalGlow} aria-hidden="true" />
                <div className={styles.hero3dStack}>
                  <article className={styles.stackCardMain}>
                    <small>Conversion de hoy</small>
                    <strong>+9 citas cerradas</strong>
                    <p>Respuesta media: 41 segundos</p>
                  </article>
                  <article className={styles.stackCardFloatA}>
                    <span>Leads sin fuga</span>
                    <b>87%</b>
                  </article>
                  <article className={styles.stackCardFloatB}>
                    <span>Escalado humano</span>
                    <b>Solo casos sensibles</b>
                  </article>
                </div>
              </div>

              <div className={styles.channelRail}>
                <span className={styles.channelChip}>
                  <PhoneMiniIcon />
                  Llamadas
                </span>
                <span className={styles.channelChip}>
                  <WhatsAppLogo size={18} />
                  WhatsApp
                </span>
                <span className={styles.channelChip}>
                  <WebchatMiniIcon />
                  Webchat
                </span>
                <span className={styles.channelChip}>
                  <GoogleCalendarLogo size={18} />
                  Google Calendar
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft} ${styles.proofSection}`}>
          <div className={styles.container}>
            <div className={styles.proofGrid}>
              <article>
                <strong>24/7</strong>
                <p>Atencion continua en los tres canales</p>
              </article>
              <article>
                <strong>&lt; 1 min</strong>
                <p>Tiempo medio de primera respuesta</p>
              </article>
              <article>
                <strong>1 panel</strong>
                <p>Conversaciones, leads, citas y calendario</p>
              </article>
              <article>
                <strong>0 friccion</strong>
                <p>Onboarding guiado para empezar rapido</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.section} id="problema">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Problema real</p>
              <h2 className={styles.sectionTitle}>
                Si no contestas rapido, el paciente reserva en otra clinica.
              </h2>
            </div>

            <div className={styles.painGridCompact}>
              <article className={styles.painCard}>
                <h3>Llamadas no atendidas</h3>
                <p>Las horas de saturacion y fuera de horario rompen conversion.</p>
              </article>
              <article className={styles.painCard}>
                <h3>Seguimiento tarde</h3>
                <p>El lead se enfria en minutos y se va con la competencia.</p>
              </article>
              <article className={styles.painCard}>
                <h3>Agenda descoordinada</h3>
                <p>Sin sistema unificado, se pierde tiempo y facturacion.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`} id="calculadora">
          <div className={styles.container}>
            <RevenueLossCalculator />
          </div>
        </section>

        <section className={styles.section} id="resultados">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Comparativa real</p>
              <h2 className={styles.sectionTitle}>Recepcionista humana vs Atiende360</h2>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th>Caracteristica</th>
                    <th>Recepcionista humana</th>
                    <th>Atiende360</th>
                  </tr>
                </thead>
                <tbody>
                  {HUMAN_VS_AI_ROWS.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td>{row.human}</td>
                      <td>{row.ai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`} id="panel-real">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Panel real de clinica</p>
              <h2 className={styles.sectionTitle}>Esta vista replica tu estructura real de operacion diaria</h2>
            </div>

            <div className={styles.realPanelStage}>
              <aside className={styles.realPanelSidebarFrame}>
                <div className={styles.realPanelBrand}>Recepcionista IA</div>
                <p className={styles.realPanelBrandSub}>Clinica demo</p>
                <ul>
                  <li>Inicio</li>
                  <li>Conversaciones</li>
                  <li>Leads</li>
                  <li>Citas</li>
                  <li>Calendario</li>
                  <li>Canales</li>
                  <li>Configuracion</li>
                </ul>
              </aside>

              <div className={styles.realPanelMainWrap}>
                <div className={styles.realPanelTopbarFrame}>
                  <div className={styles.realPanelTopbarTitle}>
                    <span>Panel principal</span>
                    <b>Controla recepcion, conversaciones y citas</b>
                  </div>
                  <div className={styles.panelTopIntegrations}>
                    <span><GoogleCalendarLogo size={16} /> Google Calendar conectado</span>
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
                    <h4>Conversaciones recientes</h4>
                    <p>Paciente: Quiero cita para limpieza esta semana.</p>
                    <p>Atiende360: Tengo hueco jueves 11:30, te encaja?</p>
                  </article>
                  <article className={styles.realPanelInfoCard}>
                    <h4>Agenda de hoy</h4>
                    <p>10:30 - Revision inicial</p>
                    <p>12:00 - Fisioterapia</p>
                    <p>17:30 - Primera consulta estetica</p>
                  </article>
                  <article className={styles.realPanelInfoCard}>
                    <h4>Leads a priorizar</h4>
                    <p>3 interesados sin reserva</p>
                    <p>2 casos para llamada humana</p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="demo">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Prueba interactiva</p>
              <h2 className={styles.sectionTitle}>Prueba como responderia Atiende360 con tu negocio</h2>
            </div>
            <AgentDemoSandbox />
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`} id="como-funciona">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Como funciona</p>
              <h2 className={styles.sectionTitle}>Implementacion guiada en 3 pasos</h2>
            </div>

            <div className={styles.stepsGrid}>
              {PROCESS_STEPS.map((step, index) => (
                <article key={step.title} className={styles.stepCard}>
                  <span>{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text.replace("clinica", "negocio")}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.featureStrip}>
              {FEATURE_BENEFITS.slice(0, 3).map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`} id="pricing">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Oferta</p>
              <h2 className={styles.sectionTitle}>Empieza gratis y valida resultado antes de pagar</h2>
            </div>
            <PricingPlans variant="landing" />
          </div>
        </section>

        <section className={styles.section} id="faq">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>FAQ</p>
              <h2 className={styles.sectionTitle}>Preguntas clave antes de probar</h2>
            </div>

            <div className={styles.faqGrid}>
              {LANDING_FAQS.slice(0, 4).map((faq) => (
                <details key={faq.q}>
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sectionDark}>
          <div className={styles.container}>
            <div className={styles.finalCtaCard}>
              <p className={styles.finalKicker}>Oferta de lanzamiento</p>
              <h2>Activa Atiende360 y convierte mas contactos en citas en menos de una semana.</h2>
              <p>
                Implantacion guiada, prueba con datos reales y riesgo minimo para tu operacion.
              </p>
              <div className={styles.finalActionRow}>
                <Link href="/login" prefetch={false} className={styles.btnPrimary}>
                  Quiero activar mi prueba
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

function PhoneMiniIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.2 3.6h3.4l1.7 4.2-2 1.3a14.2 14.2 0 0 0 6.6 6.6l1.3-2 4.2 1.7v3.4a1.8 1.8 0 0 1-2 1.8C10 20.2 3.8 14 3.4 5.6a1.8 1.8 0 0 1 1.8-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WebchatMiniIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
