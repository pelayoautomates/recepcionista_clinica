export type PricingPlan = {
  id: "starter" | "pro" | "growth";
  name: string;
  monthly: number;
  annual: number;
  subtitle: string;
  badge?: string;
  cta: string;
  features: string[];
};

export type AddOn = {
  name: string;
  price: string;
  description: string;
  badge?: string;
};

export type CompareRow = {
  feature: string;
  starter: string;
  pro: string;
  growth: string;
};

export const NAV_ITEMS = [
  { href: "/landing#como-funciona", label: "Como funciona" },
  { href: "/landing#demo", label: "Demo" },
  { href: "/landing#resultados", label: "Resultados" },
  { href: "/pricing", label: "Precios" },
  { href: "/landing#faq", label: "FAQ" },
];

export const HERO_TRUST_POINTS = [
  "Recepcionista IA activa 24/7",
  "Control humano cuando hace falta",
  "Prueba guiada sin permanencia",
  "Pensado para clinicas reales",
];

export const PAIN_POINTS = [
  "Llamadas perdidas en horas punta cuando recepcion esta saturada.",
  "Pacientes que escriben fuera de horario y no reciben respuesta hasta el dia siguiente.",
  "Leads que preguntan, nadie hace seguimiento y acaban reservando en otra clinica.",
  "Tiempo administrativo repetido en las mismas preguntas de precio, horarios y disponibilidad.",
  "Citas movidas o canceladas sin trazabilidad clara entre llamadas, chat y agenda.",
  "Falta de visibilidad real sobre cuantas oportunidades se pierden cada semana.",
];

export const PROCESS_STEPS = [
  {
    title: "Conectas tu clinica",
    text: "Compartes web, servicios, horarios y reglas basicas de agenda en una configuracion guiada.",
  },
  {
    title: "Agente360 aprende tu operativa",
    text: "Preparamos respuestas, flujos de cita y criterios para derivar casos sensibles a tu equipo.",
  },
  {
    title: "Atiende, agenda y avisa",
    text: "Empieza a responder pacientes, registrar leads y avisar a recepcion cuando toca intervenir.",
  },
];

export const FEATURE_BENEFITS = [
  {
    title: "Atiende llamadas 24/7 sin cortes",
    text: "Cuando no hay nadie en recepcion, el agente sigue capturando oportunidades.",
  },
  {
    title: "Responde chat web en tiempo real",
    text: "Reduce espera del paciente y aumenta la probabilidad de reserva en el primer contacto.",
  },
  {
    title: "WhatsApp opcional para seguimiento",
    text: "Continua conversaciones y recordatorios desde el canal que mas usa el paciente.",
  },
  {
    title: "Agenda, mueve y cancela citas",
    text: "Automatiza tareas administrativas y evita friccion en el flujo diario de recepcion.",
  },
  {
    title: "Google Calendar o calendario interno",
    text: "Si no conectas Google Calendar, Agente360 sigue funcionando con su agenda integrada.",
  },
  {
    title: "Clasifica leads y prioriza equipo",
    text: "Tu equipo sabe que pacientes estan listos para reservar y cuales requieren seguimiento.",
  },
  {
    title: "Detecta casos para intervencion humana",
    text: "Cuando aparece una consulta delicada, el agente escala y no improvisa.",
  },
  {
    title: "Resumen diario operativo",
    text: "Visualiza conversaciones, leads y citas sin perder tiempo revisando cada mensaje.",
  },
];

export const WHO_IS_FOR = [
  "Clinicas dentales con alto volumen de primeras consultas.",
  "Clinicas esteticas que necesitan responder rapido para no perder conversion.",
  "Fisioterapeutas y centros de rehabilitacion con recepcion saturada.",
  "Centros sanitarios pequenos o medianos que quieren escalar sin ampliar plantilla.",
  "Equipos que reciben contactos fuera de horario y no quieren dejar dinero en la mesa.",
  "Clinicas que necesitan trazabilidad de conversaciones, leads y citas en un solo panel.",
];

export const TRUST_BLOCKS = [
  {
    title: "Tu equipo mantiene el control",
    text: "Agente360 no sustituye criterio clinico. Deriva a humano cuando detecta riesgo o duda sensible.",
  },
  {
    title: "Historial y trazabilidad completa",
    text: "Todas las interacciones quedan registradas para auditar decisiones y mejorar el proceso.",
  },
  {
    title: "Privacidad con enfoque responsable",
    text: "Disenado para operar con buenas practicas de acceso, segregacion y control de datos.",
  },
  {
    title: "No reemplaza personas, elimina carga repetitiva",
    text: "Tu recepcionista dedica mas tiempo a pacientes de alto valor y menos a tareas mecanicas.",
  },
];

export const LANDING_FAQS = [
  {
    q: "La IA puede agendar citas directamente?",
    a: "Si. Agente360 puede crear, mover y cancelar citas segun tus reglas operativas y disponibilidad.",
  },
  {
    q: "Se conecta con Google Calendar?",
    a: "Si. Puedes conectarlo para sincronizar agenda en tiempo real.",
  },
  {
    q: "Que pasa si no uso Google Calendar?",
    a: "No pasa nada. Puedes operar con el calendario interno de Agente360.",
  },
  {
    q: "Puede atender llamadas y WhatsApp?",
    a: "La atencion de voz esta incluida por planes y WhatsApp se activa como add-on opcional.",
  },
  {
    q: "Que ocurre si el paciente pregunta algo delicado?",
    a: "El agente escala a una persona del equipo. No debe resolver consultas clinicas sensibles por su cuenta.",
  },
  {
    q: "Cuanto tarda la configuracion inicial?",
    a: "Normalmente entre 3 y 7 dias, segun volumen de servicios y canales que quieras activar.",
  },
  {
    q: "La IA sustituye a mi recepcionista?",
    a: "No. Le quita carga repetitiva para que se concentre en pacientes y tareas de mayor impacto.",
  },
  {
    q: "Como se limita la demo publica?",
    a: "La demo de voz aplica limite de duracion por sesion para mantener calidad y disponibilidad.",
  },
  {
    q: "Puedo revisar conversaciones y leads?",
    a: "Si. El panel centraliza conversaciones, leads y citas para que el equipo tenga trazabilidad completa.",
  },
  {
    q: "Como tratais la privacidad de datos?",
    a: "Trabajamos con enfoque de minimizacion, control de acceso y buenas practicas operativas.",
  },
];

export const HUMAN_VS_AI_ROWS = [
  { feature: "Coste mensual", human: "1.200 EUR - 1.800 EUR", ai: "Desde 79 EUR/mes" },
  { feature: "Disponibilidad", human: "8h al dia, 5 dias", ai: "24/7, 365 dias" },
  { feature: "Llamadas simultaneas", human: "1 a la vez", ai: "Ilimitadas" },
  { feature: "Tiempo de respuesta", human: "Variable", ai: "Menos de 1 segundo" },
  { feature: "Vacaciones o bajas", human: "Interrumpe servicio", ai: "No se detiene" },
  { feature: "Errores operativos", human: "Posibles", ai: "Consistencia en respuestas" },
  { feature: "WhatsApp", human: "Depende de carga", ai: "Respuesta inmediata" },
  { feature: "Gestion de agenda", human: "Manual", ai: "Automatica" },
  { feature: "Escalabilidad", human: "Contratar mas personal", ai: "Escala sin ampliar equipo" },
  { feature: "Personalizacion", human: "Formacion continua", ai: "Configuracion guiada" },
] as const;

export const PRICING_FAQS = [
  {
    q: "Que incluye exactamente la prueba?",
    a: "Incluye configuracion inicial, acceso al panel y validacion de flujo con una clinica o sede.",
  },
  {
    q: "Que pasa si supero los minutos incluidos?",
    a: "Puedes ampliar con packs de minutos o pasar a un plan superior.",
  },
  {
    q: "El precio cambia si activo WhatsApp?",
    a: "WhatsApp se ofrece como add-on para activarlo solo cuando de verdad te aporte valor.",
  },
  {
    q: "Hay permanencia minima?",
    a: "No. Puedes cancelar cuando quieras.",
  },
  {
    q: "Puedo tener varias sedes?",
    a: "Si. Growth incluye 2 sedes y puedes anadir sedes adicionales.",
  },
];

export const PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 99,
    annual: 79,
    subtitle: "Para una clinica que quiere validar conversion sin complejidad.",
    cta: "Probar Starter",
    features: [
      "1 negocio o sede",
      "300 minutos de llamadas IA al mes",
      "Agente de voz",
      "Webchat",
      "Calendario interno",
      "Google Calendar opcional",
      "Panel de conversaciones y citas",
      "Clasificacion basica de leads",
      "Alertas a humano",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 179,
    annual: 149,
    subtitle: "Para clinicas con mayor carga de recepcion y mas leads diarios.",
    badge: "Mas popular",
    cta: "Probar Pro",
    features: [
      "Todo lo de Starter",
      "750 minutos de llamadas IA al mes",
      "Hasta 3 usuarios del panel",
      "Resumenes automaticos semanales",
      "Seguimiento de leads mejorado",
      "Mejor personalizacion de tono",
      "Soporte email y WhatsApp",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 299,
    annual: 249,
    subtitle: "Para volumen alto o varias sedes con operativa mas exigente.",
    cta: "Probar Growth",
    features: [
      "Todo lo de Pro",
      "1.800 minutos de llamadas IA al mes",
      "2 sedes incluidas",
      "Hasta 5 usuarios del panel",
      "1 numero dedicado incluido",
      "Resumenes automaticos diarios",
      "Soporte prioritario",
      "Revision asistida inicial",
    ],
  },
];

export const ADDONS: AddOn[] = [
  {
    name: "Numero dedicado",
    price: "15 EUR/mes",
    description: "Numero exclusivo para que Agente360 atienda llamadas de tu clinica.",
  },
  {
    name: "Sede adicional",
    price: "79 EUR/mes",
    description: "Anade una sede con su propia agenda, reglas y seguimiento.",
  },
  {
    name: "WhatsApp beta",
    price: "49 EUR/mes + uso",
    description: "Canal adicional para conversaciones, recordatorios y seguimiento.",
    badge: "Beta",
  },
  {
    name: "Pack 250 minutos extra",
    price: "39 EUR",
    description: "Amplia capacidad de llamadas en meses con mayor demanda.",
  },
  {
    name: "Pack 500 minutos extra",
    price: "69 EUR",
    description: "Mejor coste por minuto para clinicas con volumen creciente.",
  },
  {
    name: "Pack 1000 minutos extra",
    price: "129 EUR",
    description: "Pensado para campañas, estacionalidad o picos de demanda.",
  },
  {
    name: "Setup asistido",
    price: "99 EUR pago unico",
    description: "Te acompanamos en configuracion inicial y reglas de atencion.",
  },
  {
    name: "Integraciones personalizadas",
    price: "Desde 199 EUR",
    description: "Conectamos sistemas adicionales segun necesidades de tu clinica.",
  },
];

export const COMPARISON_ROWS: CompareRow[] = [
  { feature: "Precio mensual", starter: "99 EUR/mes", pro: "179 EUR/mes", growth: "299 EUR/mes" },
  { feature: "Precio anual", starter: "79 EUR/mes", pro: "149 EUR/mes", growth: "249 EUR/mes" },
  { feature: "Negocios o sedes incluidas", starter: "1", pro: "1", growth: "2" },
  { feature: "Minutos incluidos", starter: "300 min", pro: "750 min", growth: "1.800 min" },
  { feature: "Usuarios del panel", starter: "1", pro: "3", growth: "5" },
  { feature: "Agente de voz", starter: "Si", pro: "Si", growth: "Si" },
  { feature: "Webchat", starter: "Si", pro: "Si", growth: "Si" },
  { feature: "Calendario interno", starter: "Si", pro: "Si", growth: "Si" },
  { feature: "Google Calendar opcional", starter: "Si", pro: "Si", growth: "Si" },
  { feature: "Alertas a humano", starter: "Si", pro: "Si", growth: "Si" },
  { feature: "Resumenes automaticos", starter: "Basico", pro: "Semanales", growth: "Diarios" },
  { feature: "Soporte", starter: "Email", pro: "Email + WhatsApp", growth: "Prioritario" },
];
