export type PricingPlan = {
  id: "starter" | "pro" | "growth";
  name: string;
  monthly: number;
  subtitle: string;
  badge?: string;
  cta: string;
  features: string[];
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
  { href: "/seguridad", label: "Seguridad" },
  { href: "/integraciones", label: "Integraciones" },
  { href: "/pricing", label: "Precios" },
  { href: "/demo", label: "Demo" },
];

export const HERO_TRUST_POINTS = [
  "Cobertura según el desvío configurado",
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
    title: "Atención telefónica cuando nadie llega",
    text: "Responde llamadas cuando recepcion esta ocupada o la clinica esta cerrada, captura el motivo y propone el siguiente paso.",
  },
  {
    title: "Desvío por no respuesta",
    text: "Tu recepción atiende primero y la IA entra solo cuando nadie llega, manteniendo el número habitual de la clínica.",
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
    a: "Atiende360 es un SaaS de recepcionista IA para clínicas privadas. Recupera llamadas no atendidas, registra leads, ayuda a agendar citas y marca para revisión las conversaciones que requieren intervención humana.",
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
    a: "Atiende360 es un software de recepcionista IA para clínicas privadas. Recupera llamadas no atendidas, registra leads, agenda citas y deriva a humano cuando hace falta.",
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
  { feature: "Disponibilidad", human: "Limitada a turnos y descanso", ai: "Según horario y desvío configurados" },
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
    a: "El piloto empieza cuando el primer canal esta preparado. Incluye configuracion asistida, acceso al panel y pruebas de los flujos acordados antes de recibir contactos reales.",
  },
  {
    q: "Que pasa si supero los minutos incluidos?",
    a: "Te avisamos antes de llegar al limite y acordamos si conviene ampliar capacidad o cambiar de plan. No se aplican extras sin informar.",
  },
  {
    q: "El precio cambia si activo WhatsApp?",
    a: "WhatsApp esta en activacion asistida. Su disponibilidad y costes de uso se confirman en la propuesta antes de conectarlo.",
  },
  {
    q: "Hay permanencia minima?",
    a: "No. Puedes cancelar cuando quieras.",
  },
  {
    q: "Puedo empezar con varias sedes?",
    a: "Ahora activamos una sede por cuenta para asegurar que agenda, desvio y derivaciones funcionan bien. Los despliegues multisede se valoran como proyecto asistido.",
  },
];

export const PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 99,
    subtitle: "Para una clinica que quiere validar conversion sin complejidad.",
    cta: "Probar Starter",
    features: [
      "1 negocio o sede",
      "300 minutos de llamadas IA al mes",
      "Agente de voz",
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
    subtitle: "Para clinicas con mayor carga de recepcion y mas leads diarios.",
    badge: "Mas popular",
    cta: "Probar Pro",
    features: [
      "Todo lo de Starter",
      "750 minutos de llamadas IA al mes",
      "Seguimiento de leads mejorado",
      "Personalizacion asistida de reglas y tono",
      "Soporte email y WhatsApp",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 299,
    subtitle: "Para una clinica con volumen alto y operativa mas exigente.",
    cta: "Probar Growth",
    features: [
      "Todo lo de Pro",
      "1.800 minutos de llamadas IA al mes",
      "Soporte prioritario",
      "Revision asistida inicial",
    ],
  },
];

export const COMPARISON_ROWS: CompareRow[] = [
  { feature: "Precio mensual", starter: "99 EUR/mes", pro: "179 EUR/mes", growth: "299 EUR/mes" },
  { feature: "Clinicas o sedes", starter: "1", pro: "1", growth: "1" },
  { feature: "Minutos incluidos", starter: "300 min", pro: "750 min", growth: "1.800 min" },
  { feature: "Agente de voz", starter: "Si", pro: "Si", growth: "Si" },
  { feature: "Calendario interno", starter: "Si", pro: "Si", growth: "Si" },
  { feature: "Google Calendar opcional", starter: "Si", pro: "Si", growth: "Si" },
  { feature: "Alertas a humano", starter: "Si", pro: "Si", growth: "Si" },
  { feature: "WhatsApp", starter: "Activacion asistida", pro: "Activacion asistida", growth: "Activacion asistida" },
  { feature: "Soporte", starter: "Email", pro: "Email + WhatsApp", growth: "Prioritario" },
];

export const ENTITY_TERMS = [
  "recepcionista IA para clinicas",
  "software de recepcion medica",
  "automatizacion de llamadas para clinicas",
  "agenda de citas con IA",
  "recepcionista virtual sanitaria",
  "WhatsApp para clinicas",
  "clasificacion de leads sanitarios",
  "derivacion humana en consultas sensibles",
  "Google Calendar para clinicas",
  "panel de conversaciones y citas",
];

export const SECURITY_PRINCIPLES = [
  {
    title: "IA para recepcion, no para diagnostico",
    text: "Atiende360 esta pensado para tareas administrativas: responder dudas operativas, recoger datos, proponer citas y escalar conversaciones delicadas.",
  },
  {
    title: "Derivacion humana configurable",
    text: "Cuando aparecen sintomas complejos, urgencias, quejas, datos ambiguos o peticiones fuera de reglas, el flujo debe pasar al equipo de la clinica.",
  },
  {
    title: "Minimizacion de datos",
    text: "La configuracion debe recoger solo la informacion necesaria para atender, registrar y agendar, evitando pedir datos clinicos que no hagan falta.",
  },
  {
    title: "Trazabilidad operativa",
    text: "Conversaciones, leads y citas quedan centralizados para que el equipo pueda revisar que se dijo, que se agendo y que requiere seguimiento.",
  },
  {
    title: "Acceso con panel privado",
    text: "El panel de gestion no esta pensado para indexarse ni exponerse a buscadores; las rutas privadas quedan bloqueadas para rastreadores.",
  },
  {
    title: "Configuracion por clinica",
    text: "Cada centro define servicios, horarios, reglas de cita, tono de respuesta y criterios de escalado segun su operativa.",
  },
];

export const INTEGRATION_BLOCKS = [
  {
    title: "Google Calendar",
    text: "Sincroniza disponibilidad y citas si la clinica ya trabaja con Google Calendar.",
  },
  {
    title: "Calendario interno",
    text: "Permite operar sin una agenda externa desde el primer dia, con reglas basicas de disponibilidad.",
  },
  {
    title: "Telefono IA",
    text: "Atiende llamadas entrantes y recoge motivo, datos y disponibilidad cuando el canal de voz esta activo.",
  },
  {
    title: "WhatsApp",
    text: "Canal opcional para seguimiento y conversacion, sujeto a activacion y costes de uso.",
  },
  {
    title: "Integraciones personalizadas",
    text: "Se valoran caso por caso cuando la clinica necesita conectar sistemas adicionales.",
  },
];

export const GENERIC_COMPARISON = [
  {
    title: "Objetivo principal",
    generic: "Responder preguntas de forma general.",
    atende: "Convertir contactos en citas trazables y escalar lo sensible.",
  },
  {
    title: "Contexto operativo",
    generic: "Depende de prompts genericos y documentos sueltos.",
    atende: "Trabaja con servicios, horarios, reglas de agenda, canales y panel.",
  },
  {
    title: "Agenda",
    generic: "Normalmente no gestiona disponibilidad real sin desarrollo adicional.",
    atende: "Incluye calendario interno y Google Calendar opcional.",
  },
  {
    title: "Seguimiento",
    generic: "Puede perder trazabilidad si no se conecta a un CRM.",
    atende: "Centraliza conversaciones, leads, estados y citas.",
  },
  {
    title: "Limites clinicos",
    generic: "Puede requerir mucha supervision para no responder de mas.",
    atende: "Define derivacion humana para conversaciones sensibles.",
  },
];
