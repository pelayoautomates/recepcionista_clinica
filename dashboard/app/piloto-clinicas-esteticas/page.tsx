import type { Metadata } from "next";
import DemoRequestForm from "@/components/marketing/DemoRequestForm";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";

export const metadata: Metadata = {
  title: "Piloto de recuperación de llamadas para clínicas estéticas",
  description: "Prueba Atiende360 con tu número, tus servicios y tus reglas de derivación mediante una activación asistida.",
  alternates: { canonical: "/piloto-clinicas-esteticas" },
};

const benefits = [
  ["Conservas tu número", "Configuramos un desvío por no respuesta: tu recepción sigue siendo la primera opción."],
  ["Agenda con tus reglas", "Servicios, horarios, profesionales y casos que siempre deben pasar a una persona."],
  ["Control humano", "Las urgencias y situaciones sensibles se derivan; la IA se identifica desde el primer saludo."],
];

export default function PilotLandingPage() {
  return (
    <MarketingShell active="demo">
      <main>
        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>PILOTO PARA CLÍNICAS ESTÉTICAS</p>
              <h1>Recupera las llamadas que tu recepción no puede coger.</h1>
              <p>
                Atiende360 responde cuando nadie llega, agenda primeras valoraciones con tus reglas y deriva los
                casos sensibles. Tu equipo conserva el control y tú conservas tu número.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.featureStrip}>
              {benefits.map(([title, body]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sectionSoft}>
          <div className={styles.container}>
            <div className={styles.contentGrid}>
              <div>
                <p className={styles.sectionKicker}>OFERTA FUNDADORES</p>
                <h2 className={styles.sectionTitle}>Un piloto asistido, no una promesa genérica.</h2>
                <p className={styles.sectionSubtitle}>
                  169 €/mes + IVA, 300 minutos, una sede, agenda interna o Google Calendar y activación asistida.
                  Sin permanencia. Confirmamos contigo los costes de canales antes de conectar nada.
                </p>
                <div className={styles.checkList}>
                  <p>Configuración con los servicios y preguntas reales de tu clínica.</p>
                  <p>Prueba de llamada, reserva, cambio, cancelación y derivación antes de abrir tráfico.</p>
                  <p>Revisión conjunta de resultados y llamadas recuperadas durante el piloto.</p>
                </div>
              </div>
              <DemoRequestForm />
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
