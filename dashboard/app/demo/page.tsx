import type { Metadata } from "next";
import Link from "next/link";
import DemoRequestForm from "@/components/marketing/DemoRequestForm";
import MarketingShell from "@/components/marketing/MarketingShell";
import styles from "@/components/marketing/MarketingStyles.module.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export const metadata: Metadata = {
  title: "Pedir demo de recepcionista IA para clinicas",
  description:
    "Solicita una demo guiada de Atiende360 para revisar llamadas, webchat, WhatsApp, agenda y derivacion humana en tu clinica.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Pedir demo de Atiende360",
    description:
      "Demo guiada de recepcionista IA para clinicas privadas: canales, agenda, leads y criterios de escalado.",
    url: "/demo",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": `${siteUrl}/demo#contact`,
  url: `${siteUrl}/demo`,
  name: "Pedir demo de Atiende360",
  description: "Pagina para solicitar una demo guiada de Atiende360.",
  mainEntity: {
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}/#software`,
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Demo", item: `${siteUrl}/demo` },
    ],
  },
};

export default function DemoPage() {
  return (
    <MarketingShell active="demo">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className={styles.pageHero}>
          <div className={styles.container}>
            <div className={styles.pageHeroInner}>
              <p className={styles.sectionKicker}>Demo guiada</p>
              <h1>Pide una demo de recepcionista IA para tu clinica</h1>
              <p>
                Revisamos tus canales, horarios, agenda y tipo de pacientes para ver si Atiende360 encaja antes de
                activar nada en produccion.
              </p>
              <div className={styles.heroCtaRowCenter}>
                <Link href="/#demo" className={styles.btnSecondary} prefetch={false}>Probar demo interactiva</Link>
                <a href="mailto:hola@atiende360.com" className={styles.btnGhost}>Escribir directamente</a>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.contentGrid}>
              <div>
                <p className={styles.sectionKicker}>Que revisamos</p>
                <h2 className={styles.sectionTitle}>Una demo util debe usar reglas reales</h2>
                <p className={styles.sectionSubtitle}>
                  No se trata de ver una IA generica contestando. La demo debe validar si el flujo puede responder,
                  registrar leads, proponer citas y derivar a humano segun tu operativa.
                </p>
                <div className={styles.checkList}>
                  <p>Servicios principales y duracion aproximada.</p>
                  <p>Horarios, profesionales y disponibilidad.</p>
                  <p>Canales actuales: telefono, webchat, WhatsApp o calendario.</p>
                  <p>Preguntas frecuentes que recibe recepcion.</p>
                  <p>Criterios para no responder y pasar a humano.</p>
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
