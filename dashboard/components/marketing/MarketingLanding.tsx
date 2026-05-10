import Link from "next/link";
import MarketingShell from "./MarketingShell";
import PricingPlans from "./PricingPlans";
import RevenueLossCalculator from "./RevenueLossCalculator";
import AgentDemoSandbox from "./AgentDemoSandbox";
import styles from "./MarketingStyles.module.css";
import { GoogleCalendarLogo, WhatsAppLogo } from "@/components/BrandLogos";
import {
  ANSWER_BLOCKS,
  DIFFERENTIATORS,
  FEATURE_BENEFITS,
  HERO_TRUST_POINTS,
  HUMAN_VS_AI_ROWS,
  LANDING_FAQS,
  LIMITATIONS,
  PROCESS_STEPS,
  USE_CASES,
  WHO_IS_FOR,
} from "@/lib/marketing-content";

export default function MarketingLanding() {
  return (
    <MarketingShell active="landing">
      <main>
        <section className={styles.heroSectionConversion}>
          <div className={styles.container}>
            <div className={styles.heroConversionGrid}>
              <div className={styles.heroConversionCopy}>
                <p className={styles.heroKicker}>SOFTWARE DE RECEPCIONISTA IA PARA CLINICAS PRIVADAS</p>
                <h1 className={styles.heroConversionTitle}>
                  Recepcionista IA para clinicas que convierte llamadas y mensajes en citas.
                </h1>
                <p className={styles.heroConversionLead}>
                  Atiende360 atiende por telefono, WhatsApp y webchat, registra leads, agenda en Google Calendar
                  o calendario interno y deriva a humano las consultas sensibles. Menos contactos perdidos,
                  mas citas trazables y menos carga repetitiva para recepcion.
                </p>

                <div className={styles.heroConversionCta}>
                  <Link href="/login" prefetch={false} className={styles.btnPrimary}>
                    Pedir demo guiada
                  </Link>
                  <a href="#como-funciona" className={styles.btnSecondary}>
                    Ver como funciona
                  </a>
                </div>

                <p className={styles.offerLine}>
                  Para dentistas, estetica, fisioterapia y centros sanitarios privados que no pueden permitirse perder leads.
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
                    <small>Flujo de recepcion</small>
                    <strong>Contacto, lead, cita y escalado</strong>
                    <p>Todo queda registrado para que el equipo sepa que paso y que toca hacer.</p>
                  </article>
                  <article className={styles.stackCardFloatA}>
                    <span>Canal entrante</span>
                    <b>Llamada o chat</b>
                  </article>
                  <article className={styles.stackCardFloatB}>
                    <span>Escalado humano</span>
                    <b>Casos sensibles</b>
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
                <p>Atencion continua en canales activos</p>
              </article>
              <article>
                <strong>3 canales</strong>
                <p>Telefono, WhatsApp y webchat</p>
              </article>
              <article>
                <strong>1 panel</strong>
                <p>Conversaciones, leads, citas y calendario</p>
              </article>
              <article>
                <strong>Humano</strong>
                <p>Derivacion cuando hay dudas sensibles</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.section} id="que-es">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Respuesta rapida</p>
              <h2 className={styles.sectionTitle}>Que es Atiende360 y cuando encaja</h2>
              <p className={styles.sectionSubtitle}>
                Un resumen directo para compradores, Google y motores de respuesta con IA: producto, publico,
                problema, funcionamiento y limites operativos.
              </p>
            </div>

            <div className={styles.answerGrid}>
              {ANSWER_BLOCKS.map((item) => (
                <article key={item.q} className={styles.answerCard}>
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="problema">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Problema real</p>
              <h2 className={styles.sectionTitle}>
                Si una clinica no responde rapido, el paciente compara y reserva en otro sitio.
              </h2>
              <p className={styles.sectionSubtitle}>
                La perdida no siempre se ve en caja: empieza en llamadas sin contestar, mensajes pendientes,
                seguimientos tardios y agendas que no estan conectadas con la conversacion.
              </p>
            </div>

            <div className={styles.painGridCompact}>
              <article className={styles.painCard}>
                <h3>Llamadas no atendidas</h3>
                <p>Las horas de saturacion y fuera de horario rompen conversion justo cuando el paciente tiene intencion.</p>
              </article>
              <article className={styles.painCard}>
                <h3>Seguimiento tarde</h3>
                <p>El lead se enfria en minutos si nadie responde, confirma datos o propone una cita concreta.</p>
              </article>
              <article className={styles.painCard}>
                <h3>Agenda descoordinada</h3>
                <p>Sin sistema unificado, llamadas, chats, calendario y notas quedan repartidos entre herramientas.</p>
              </article>
              <article className={styles.painCard}>
                <h3>Recepcion saturada</h3>
                <p>El equipo dedica demasiado tiempo a preguntas repetidas en lugar de priorizar pacientes de valor.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`} id="calculadora">
          <div className={styles.container}>
            <RevenueLossCalculator />
          </div>
        </section>

        <section className={styles.section} id="solucion">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Solucion</p>
              <h2 className={styles.sectionTitle}>Un sistema de recepcion digital, no solo un chatbot</h2>
              <p className={styles.sectionSubtitle}>
                Atiende360 combina agente de voz, chat, WhatsApp, calendario y panel de gestion para que cada
                contacto tenga contexto, estado y siguiente accion.
              </p>
            </div>

            <div className={styles.solutionGrid}>
              <article className={styles.solutionCard}>
                <h3>Antes</h3>
                <p>Llamadas perdidas, mensajes sin dueño, citas apuntadas a mano y leads sin seguimiento claro.</p>
              </article>
              <article className={styles.solutionCard}>
                <h3>Despues</h3>
                <p>Respuesta inmediata, datos capturados, cita propuesta o agendada y trazabilidad para recepcion.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`} id="funcionalidades">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Funcionalidades</p>
              <h2 className={styles.sectionTitle}>Que incluye Atiende360</h2>
              <p className={styles.sectionSubtitle}>
                Las funciones se centran en recepcion, conversion y agenda. El contenido es textual para que
                tambien pueda ser rastreado, resumido y citado por buscadores y sistemas de IA.
              </p>
            </div>

            <div className={styles.featureGrid}>
              {FEATURE_BENEFITS.slice(0, 6).map((item) => (
                <article key={item.title} className={styles.featureCard}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="para-quien">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Publico objetivo</p>
              <h2 className={styles.sectionTitle}>Para que clinicas esta pensado</h2>
              <p className={styles.sectionSubtitle}>
                Atiende360 encaja mejor en centros privados donde una respuesta tardia suele convertirse en una cita perdida.
              </p>
            </div>

            <div className={styles.whoGrid}>
              {WHO_IS_FOR.map((item) => (
                <article key={item} className={styles.whoCard}>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft}`} id="casos-de-uso">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Casos de uso</p>
              <h2 className={styles.sectionTitle}>Donde aporta mas valor</h2>
            </div>

            <div className={styles.featureGrid}>
              {USE_CASES.map((item) => (
                <article key={item.title} className={styles.featureCard}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="resultados">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Comparativa operativa</p>
              <h2 className={styles.sectionTitle}>Recepcion manual vs Atiende360</h2>
              <p className={styles.sectionSubtitle}>
                La IA no reemplaza el criterio humano. Automatiza la primera respuesta, el registro y las tareas
                repetitivas para que el equipo atienda mejor lo importante.
              </p>
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
              <p className={styles.sectionKicker}>Panel operativo</p>
              <h2 className={styles.sectionTitle}>Una vista de trabajo para conversaciones, leads y citas</h2>
              <p className={styles.sectionSubtitle}>
                El panel ayuda a recepcion y direccion a ver que contactos entraron, que citas se agendaron
                y que conversaciones necesitan revision humana.
              </p>
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
              <p className={styles.sectionSubtitle}>
                El cliente no necesita entrenar un modelo desde cero. Necesita aportar informacion operativa
                de la clinica y validar las reglas antes de activar canales.
              </p>
            </div>

            <div className={styles.stepsGrid}>
              {PROCESS_STEPS.map((step, index) => (
                <article key={step.title} className={styles.stepCard}>
                  <span>{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="diferenciacion">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Diferenciacion y limites</p>
              <h2 className={styles.sectionTitle}>Especifico para recepcion clinica, con limites claros</h2>
            </div>

            <div className={styles.featureGrid}>
              {DIFFERENTIATORS.map((item) => (
                <article key={item.title} className={styles.featureCard}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>

            <div className={styles.limitBox} aria-label="Limitaciones de Atiende360">
              <h3>Que no hace Atiende360</h3>
              <ul>
                {LIMITATIONS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
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
              <h2 className={styles.sectionTitle}>Preguntas frecuentes antes de pedir demo</h2>
              <p className={styles.sectionSubtitle}>
                Respuestas concretas sobre alcance, integraciones, seguridad operativa, configuracion y diferencias frente a una solucion generica.
              </p>
            </div>

            <div className={styles.faqGrid}>
              {LANDING_FAQS.slice(0, 10).map((faq) => (
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
              <p className={styles.finalKicker}>Siguiente paso</p>
              <h2>Comprueba si Atiende360 encaja con la recepcion de tu clinica.</h2>
              <p>
                Revisamos tus canales, agenda y volumen de contactos para configurar una demo con reglas reales,
                sin prometer automatizaciones que tu operativa no necesite.
              </p>
              <div className={styles.finalActionRow}>
                <Link href="/login" prefetch={false} className={styles.btnPrimary}>
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
