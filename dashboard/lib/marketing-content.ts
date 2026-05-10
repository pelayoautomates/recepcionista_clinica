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
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#funcionalidades", label: "Funciones" },
  { href: "/#casos-de-uso", label: "Casos de uso" },
  { href: "/pricing", label: "Precios" },
  { href: "/#faq", label: "FAQ" },
];

export const HERO_TRUST_POINTS = [
  "Recepcionista IA 24/7 para clinicas privadas",
  "Agenda citas y registra leads",
  "Derivacion humana en casos sensibles",
  "Setup guiado sin permanencia",
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
    title: "Atiende360 aprende tu operativa",
    text: "Preparamos respuestas, flujos de cita y criterios para derivar casos sensibles a tu equipo.",
  },
  {
    title: "Atiende, agenda y avisa",
    text: "Empieza a responder pacientes, registrar leads y avisar a recepcion cuando toca intervenir.",
  },
];

export const FEATURE_BENEFITS = [
  {
    title: "Atencion telefonica 24/7",
    text: "Responde llamadas cuando recepcion esta ocupada o la clinica esta cerrada, captura el motivo y propone el siguiente paso.",
  },
  {
    title: "Webchat con contexto de la clinica",
    text: "Contesta preguntas frecuentes sobre servicios, horarios y disponibilidad con informacion configurada para tu centro.",
  },
  {
    title: "WhatsApp para seguimiento",
    text: "Permite continuar conversaciones, resolver dudas operativas y recuperar leads que no reservaron en el primer contacto.",
  },
  {
    title: "Gestion de citas",
    text: "Crea, mueve o cancela citas segun reglas de disponibilidad y deja trazabilidad para el equipo.",
  },
  {
    title: "Google Calendar o calendario interno",
    text: "Sincroniza con Google Calendar o trabaja con calendario interno si tu clinica aun no usa una agenda externa.",
  },
  {
    title: "Clasificacion de leads",
    text: "Identifica contactos listos para reservar, dudas pendientes y conversaciones que requieren seguimiento humano.",
  },
  {
    title: "Escalado a humano",
    text: "Deriva consultas clinicas sensibles, incidencias o peticiones fuera de reglas para que el equipo mantenga el control.",
  },
  {
    title: "Panel operativo",
    text: "Centraliza conversaciones, leads, citas y calendario para revisar la recepcion digital desde un unico lugar.",
  },
];

export const WHO_IS_FOR = [
  "Clinicas dentales con alto volumen de primeras consultas y llamadas perdidas.",
  "Clinicas esteticas que necesitan responder rapido antes de que el lead compare alternativas.",
  "Fisioterapeutas y centros de rehabilitacion con recepcion saturada por cambios de cita.",
  "Centros sanitarios pequeños o medianos que quieren atender mas sin ampliar plantilla desde el primer dia.",
  "Clinicas que reciben contactos fuera de horario y necesitan convertirlos en citas trazables.",
  "Equipos que quieren centralizar conversaciones, leads y calendario en un solo panel operativo.",
];

export const ANSWER_BLOCKS = [
  {
    q: "Que es Atiende360?",
    a: "Atiende360 es un SaaS de recepcionista IA para clinicas privadas. Atiende llamadas, WhatsApp y webchat, registra leads, ayuda a agendar citas y avisa al equipo cuando una conversacion requiere intervencion humana.",
  },
  {
    q: "Para quien es Atiende360?",
    a: "Esta pensado para clinicas dentales, esteticas, fisioterapia, rehabilitacion y otros centros sanitarios privados que pierden oportunidades por no responder a tiempo o por tener recepcion saturada.",
  },
  {
    q: "Que problema resuelve?",
    a: "Reduce llamadas sin contestar, respuestas tardias, seguimientos manuales y descoordinacion entre mensajes, leads y agenda. El objetivo es convertir mas contactos en citas sin cargar mas al equipo.",
  },
  {
    q: "Como funciona?",
    a: "La clinica configura servicios, horarios, reglas de agenda, canales y criterios de escalado. A partir de ahi, el agente responde, clasifica el contacto, propone citas disponibles y deja todo registrado en el panel.",
  },
];

export const USE_CASES = [
  {
    title: "Llamadas fuera de horario",
    text: "El paciente llama por la tarde o en fin de semana. Atiende360 recoge motivo, datos de contacto y disponibilidad para no perder la oportunidad.",
  },
  {
    title: "Primera consulta con alta intencion",
    text: "Un lead pregunta por un tratamiento. El agente responde dudas operativas, propone cita y registra el estado para seguimiento.",
  },
  {
    title: "Recepcion saturada",
    text: "Cuando entran varias llamadas o chats a la vez, la IA cubre preguntas repetitivas y deriva solo lo que necesita criterio humano.",
  },
  {
    title: "Cambios y cancelaciones",
    text: "El paciente necesita mover una cita. El sistema consulta disponibilidad y actualiza la agenda segun reglas definidas.",
  },
  {
    title: "Seguimiento por WhatsApp",
    text: "Si el paciente no reserva en el primer contacto, el equipo puede continuar la conversacion desde el canal mas usado.",
  },
  {
    title: "Control diario de conversion",
    text: "Direccion o recepcion revisa conversaciones, leads y citas desde un panel para detectar cuellos de botella.",
  },
];

export const DIFFERENTIATORS = [
  {
    title: "Diseñado para clinicas, no para soporte generico",
    text: "La configuracion gira alrededor de servicios, profesionales, horarios, reglas de agenda, derivacion humana y trazabilidad de pacientes potenciales.",
  },
  {
    title: "Conversion antes que automatizacion decorativa",
    text: "El flujo prioriza cerrar o recuperar citas: responde rapido, captura datos, clasifica intencion y deja tareas claras para el equipo.",
  },
  {
    title: "Control humano en conversaciones sensibles",
    text: "Atiende360 no debe resolver dudas clinicas delicadas ni sustituir criterio profesional. Cuando detecta riesgo o ambiguedad, deriva.",
  },
];

export const LIMITATIONS = [
  "No sustituye diagnostico medico ni criterio clinico profesional.",
  "Necesita reglas de agenda, servicios y disponibilidad bien configurados para reservar con precision.",
  "Las integraciones externas dependen del plan, del canal y de la viabilidad tecnica de cada sistema.",
  "WhatsApp puede requerir activacion adicional y costes de uso segun configuracion.",
];

export const TRUST_BLOCKS = [
  {
    title: "Tu equipo mantiene el control",
    text: "Atiende360 no sustituye criterio clinico. Deriva a humano cuando detecta riesgo o duda sensible.",
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
    q: "Que es Atiende360?",
    a: "Atiende360 es un software de recepcionista IA para clinicas privadas. Atiende llamadas, WhatsApp y webchat, registra leads, agenda citas y deriva a humano cuando hace falta.",
  },
  {
    q: "Cuanto tiempo puede ahorrar a una clinica?",
    a: "Depende del volumen de llamadas, chats y cambios de cita. La calculadora de la landing permite estimar el impacto de oportunidades no atendidas antes de activar un plan.",
  },
  {
    q: "Que necesita una clinica para empezar?",
    a: "Necesita definir servicios, horarios, reglas de cita, datos basicos de contacto y canales que quiere activar. El setup guiado suele tardar entre 3 y 7 dias.",
  },
  {
    q: "Es seguro usar una IA para recepcion sanitaria?",
    a: "Atiende360 esta pensado para tareas operativas de recepcion, no para diagnostico. Aplica escalado humano en consultas sensibles y trabaja con enfoque de minimizacion y control de acceso.",
  },
  {
    q: "La IA puede agendar citas directamente?",
    a: "Si. Atiende360 puede crear, mover y cancelar citas segun tus reglas operativas y disponibilidad.",
  },
  {
    q: "Se conecta con Google Calendar?",
    a: "Si. Puedes conectarlo para sincronizar agenda en tiempo real.",
  },
  {
    q: "Que pasa si no uso Google Calendar?",
    a: "No pasa nada. Puedes operar con el calendario interno de Atiende360.",
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
    q: "Que diferencia hay frente a un chatbot generico?",
    a: "Un chatbot generico suele responder preguntas. Atiende360 esta orientado a recepcion clinica: llamadas, agenda, leads, calendario, derivacion humana y panel operativo.",
  },
  {
    q: "Se integra con herramientas externas?",
    a: "Incluye Google Calendar opcional y puede trabajar con calendario interno. Otras integraciones se valoran segun necesidades de la clinica y plan contratado.",
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
  { feature: "Disponibilidad", human: "Limitada a turnos y descanso", ai: "Disponible 24/7 segun canales activos" },
  { feature: "Picos de demanda", human: "Colas, llamadas perdidas o espera", ai: "Cubre contactos simultaneos segun capacidad contratada" },
  { feature: "Seguimiento de leads", human: "Manual y facil de olvidar", ai: "Registro y clasificacion en panel" },
  { feature: "Gestion de agenda", human: "Manual o dispersa entre herramientas", ai: "Reglas de cita y calendario centralizado" },
  { feature: "Escalado sensible", human: "Depende de criterio del momento", ai: "Derivacion configurada a humano" },
  { feature: "Trazabilidad", human: "Notas, llamadas y mensajes separados", ai: "Conversaciones, leads y citas en un mismo panel" },
  { feature: "Coste operativo", human: "Coste fijo de personal y cobertura", ai: "Planes SaaS desde 99 EUR/mes" },
  { feature: "Mejor uso del equipo", human: "Mucho tiempo en preguntas repetidas", ai: "Mas tiempo para pacientes y casos complejos" },
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
    description: "Numero exclusivo para que Atiende360 atienda llamadas de tu clinica.",
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
