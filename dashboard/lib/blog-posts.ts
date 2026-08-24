export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readingTime: number;
  content: BlogSection[];
  keywords: string[];
  /** Título para <title> cuando el titular del artículo es demasiado largo para SERP */
  seoTitle?: string;
  /** Meta description recortada a la longitud que muestra Google */
  seoDescription?: string;
};

export type BlogSection = {
  type: "h2" | "h3" | "p" | "ul" | "ol" | "cta";
  text?: string;
  items?: string[];
  ctaText?: string;
  ctaHref?: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "como-reducir-no-shows-clinica-privada",
    title: "Cómo reducir las citas no atendidas en tu clínica privada",
    seoTitle: "Cómo reducir los no-shows en tu clínica",
    seoDescription:
      "Los no-shows cuestan entre 40 y 120 € por cita. Cómo reducirlos con recordatorios, confirmación activa y lista de espera automática.",
    description:
      "Los no-shows cuestan entre 40 y 120€ por cita en clínicas privadas. Descubre las estrategias más efectivas para reducirlos con recordatorios, confirmación activa y lista de espera automática.",
    date: "2026-05-10",
    category: "Gestión de citas",
    readingTime: 7,
    keywords: [
      "no-shows clínica",
      "reducir citas no atendidas",
      "recordatorios automáticos clínica",
      "confirmación citas clínica privada",
      "lista de espera clínica",
    ],
    content: [
      {
        type: "p",
        text: "Los no-shows —citas reservadas que el paciente no cancela y no asiste— son uno de los mayores problemas de rentabilidad en clínicas privadas. Según datos del sector sanitario en España, entre el 10% y el 30% de las citas no son atendidas dependiendo de la especialidad. En términos económicos, cada no-show cuesta entre 40€ y 120€ contando el tiempo del profesional y la oportunidad perdida de atender a otro paciente.",
      },
      {
        type: "h2",
        text: "Por qué se producen los no-shows",
      },
      {
        type: "p",
        text: "La causa más frecuente no es la mala intención del paciente, sino el olvido y la fricción para cancelar. Si cancelar una cita requiere llamar durante horario de atención, esperar en cola y hablar con alguien, muchos pacientes simplemente no lo hacen. El resultado es un hueco vacío en la agenda que nadie va a cubrir.",
      },
      {
        type: "ul",
        items: [
          "Olvido: el paciente simplemente no recuerda la cita.",
          "Fricción de cancelación: no sabe cómo cancelar fácilmente.",
          "Cambio de prioridades: surgió algo y no comunicó el cambio.",
          "Distancia percibida: clínica lejos y no consideró el coste del no-show.",
          "Dudas no resueltas: el paciente no estaba del todo comprometido con la cita.",
        ],
      },
      {
        type: "h2",
        text: "Las estrategias más efectivas para reducir no-shows",
      },
      {
        type: "h3",
        text: "1. Recordatorio con confirmación activa, no solo notificación",
      },
      {
        type: "p",
        text: "Enviar un recordatorio pasivo ('Tienes cita mañana') reduce no-shows entre un 15% y un 20%. Pero un recordatorio con confirmación activa, donde el paciente debe responder 'Sí' o '1' para confirmar, reduce no-shows hasta un 40-50%. La diferencia es que el paciente tiene que tomar una decisión activa, lo que activa la intención de asistir.",
      },
      {
        type: "p",
        text: "El momento ideal para el primer recordatorio es 24 horas antes. Un segundo recordatorio 2 horas antes de la cita actúa como recordatorio de último momento sin ser intrusivo.",
      },
      {
        type: "h3",
        text: "2. Cancelación self-service en el mismo mensaje",
      },
      {
        type: "p",
        text: "El recordatorio debe incluir siempre una forma fácil de cancelar o reprogramar. Si el paciente necesita llamar para cancelar, no va a cancelar. Si puede responder '2' o hacer click en un enlace del SMS, cancelará cuando sepa que no puede asistir, y tú tendrás tiempo de ofrecer el hueco a otro paciente.",
      },
      {
        type: "h3",
        text: "3. Lista de espera activa",
      },
      {
        type: "p",
        text: "Cuando se produce una cancelación, el sistema debería contactar automáticamente al primero de la lista de espera para ofrecerle el hueco. Una lista de espera que funciona de forma manual raramente se usa porque requiere que alguien llame a varios pacientes cada vez que hay una cancelación. Automatizada, es una fuente de recuperación de huecos muy eficiente.",
      },
      {
        type: "h3",
        text: "4. Política de cancelación comunicada desde el primer contacto",
      },
      {
        type: "p",
        text: "Comunicar durante la reserva que la cancelación debe hacerse con al menos 24 horas de antelación hace que el paciente sienta que tiene una responsabilidad. Esto no requiere cobrar penalizaciones (aunque es posible para especialidades con alta tasa de no-show como psicología o nutrición), sino simplemente establecer una expectativa clara.",
      },
      {
        type: "h3",
        text: "5. Seguimiento de leads que no confirmaron",
      },
      {
        type: "p",
        text: "Si un paciente no confirma la cita a las 12 horas del recordatorio, es una señal de que puede que no asista. Un seguimiento proactivo —una llamada rápida o mensaje— antes de que llegue la cita puede resolverlo: el paciente confirma, reprograma o cancela, y tú sigues sin no-show.",
      },
      {
        type: "h2",
        text: "Cuánto puedes recuperar con estas medidas",
      },
      {
        type: "p",
        text: "Una clínica dental con 20 citas por semana y una tasa de no-show del 15% pierde unas 3 citas semanales. A 80€ por cita, son 240€ semanales o más de 10.000€ al año en ingresos no facturados. Con recordatorio + confirmación activa, recuperar el 50% de esos no-shows es un objetivo realista, lo que supone más de 5.000€ anuales adicionales sin invertir en más pacientes.",
      },
      {
        type: "h2",
        text: "Cómo automatizar estas estrategias en tu clínica",
      },
      {
        type: "p",
        text: "Las estrategias descritas se pueden implementar manualmente, pero el coste en tiempo de recepción hace que muchas clínicas no las apliquen de forma consistente. La automatización con un sistema de recepción inteligente permite enviar recordatorios, gestionar confirmaciones y activar la lista de espera sin intervención humana, con el mismo resultado pero sin carga adicional para el equipo.",
      },
      {
        type: "cta",
        ctaText: "Ver cómo funciona Atiende360",
        ctaHref: "/#como-funciona",
      },
    ],
  },
  {
    slug: "inteligencia-artificial-para-clinicas-guia",
    title: "Inteligencia artificial para clínicas: qué necesitas saber antes de contratar",
    seoTitle: "IA para clínicas: guía antes de contratar",
    seoDescription:
      "Cómo la IA ayuda en recepción, agenda y seguimiento de pacientes: casos de uso reales, limitaciones y criterios para elegir bien.",
    description:
      "Guía práctica sobre cómo la IA puede ayudar a una clínica privada en recepción, agenda y seguimiento de pacientes. Casos de uso reales, limitaciones y criterios para elegir bien.",
    date: "2026-05-08",
    category: "IA para clínicas",
    readingTime: 9,
    keywords: [
      "inteligencia artificial clínica privada",
      "software IA clínica",
      "automatización recepción médica",
      "chatbot para clínicas",
      "recepcionista virtual clínica",
    ],
    content: [
      {
        type: "p",
        text: "La inteligencia artificial ha pasado de ser una tendencia tecnológica a una herramienta concreta que clínicas privadas de toda España están adoptando para resolver problemas reales de recepción, agenda y seguimiento de pacientes. Sin embargo, la brecha entre lo que promete el marketing y lo que realmente funciona en el día a día de una clínica sigue siendo amplia. Esta guía está pensada para directores y responsables de clínicas que quieren entender qué puede hacer la IA por su negocio —y qué no puede— antes de tomar una decisión.",
      },
      {
        type: "h2",
        text: "Qué puede hacer la IA en una clínica privada hoy",
      },
      {
        type: "h3",
        text: "Atención de primeros contactos 24/7",
      },
      {
        type: "p",
        text: "El caso de uso más claro y probado es atender llamadas, mensajes de WhatsApp y chats web fuera del horario de recepción. Un paciente que llama a las 21:00 preguntando por disponibilidad o precios no puede esperar hasta las 9:00 del día siguiente. Una recepcionista de IA puede responder dudas operativas, recoger datos de contacto y proponer citas disponibles según las reglas de la clínica, sin que ningún humano tenga que estar disponible.",
      },
      {
        type: "h3",
        text: "Gestión de citas y agenda",
      },
      {
        type: "p",
        text: "Los sistemas de IA más avanzados no solo responden preguntas, sino que pueden crear, mover y cancelar citas directamente en la agenda de la clínica —conectada a Google Calendar o a un calendario interno— según disponibilidad real y reglas de reserva configuradas. Esto elimina el ciclo manual de llamada, confirmación y actualización de agenda.",
      },
      {
        type: "h3",
        text: "Clasificación y seguimiento de leads",
      },
      {
        type: "p",
        text: "No todos los contactos que llegan a una clínica tienen la misma intención ni el mismo momento de compra. La IA puede clasificar leads según canal de origen, información proporcionada y estado de la conversación, y activar seguimientos automáticos para pacientes que no reservaron en el primer contacto.",
      },
      {
        type: "h3",
        text: "Reducción de no-shows",
      },
      {
        type: "p",
        text: "Recordatorios automáticos antes de cada cita, con posibilidad de confirmar o cancelar desde el mismo mensaje, reducen significativamente la tasa de no-show. Cuando se produce una cancelación, la IA puede activar la lista de espera y ofrecer el hueco a otro paciente.",
      },
      {
        type: "h2",
        text: "Lo que la IA no puede ni debe hacer en una clínica",
      },
      {
        type: "p",
        text: "Es igual de importante saber los límites. Una clínica que confía en la IA para resolver consultas clínicas, dar diagnósticos o tomar decisiones médicas comete un error grave de diseño que puede tener consecuencias legales y de reputación.",
      },
      {
        type: "ul",
        items: [
          "No debe dar diagnósticos ni interpretar síntomas.",
          "No debe dar presupuestos cerrados sin revisión humana.",
          "No debe resolver quejas o incidencias complejas sin escalar.",
          "No debe sustituir el criterio profesional en ninguna decisión clínica.",
          "No debe recoger datos de salud sin que el paciente haya dado consentimiento explícito.",
        ],
      },
      {
        type: "p",
        text: "Un sistema bien configurado detecta cuándo una conversación requiere intervención humana y la deriva de forma inmediata, sin intentar resolver lo que no está preparado para resolver.",
      },
      {
        type: "h2",
        text: "Criterios para evaluar un software de recepción IA para tu clínica",
      },
      {
        type: "h3",
        text: "1. ¿Habla bien español y entiende el contexto médico?",
      },
      {
        type: "p",
        text: "Parece obvio, pero muchas herramientas de IA están optimizadas para inglés y tienen un desempeño inferior en español, especialmente en registros formales y términos médicos. Prueba el agente con preguntas reales que te hacen tus pacientes.",
      },
      {
        type: "h3",
        text: "2. ¿Puede conectarse a tu agenda real?",
      },
      {
        type: "p",
        text: "Un agente que solo responde preguntas pero no puede reservar directamente tiene un valor limitado. Busca soluciones que se integren con Google Calendar o que tengan su propio calendario con disponibilidad configurable.",
      },
      {
        type: "h3",
        text: "3. ¿Tiene escalado humano real?",
      },
      {
        type: "p",
        text: "El escalado a humano no es solo 'enviar un email'. Debe haber un panel donde tu equipo vea en tiempo real qué conversaciones necesitan atención, con contexto completo de lo que ya se habló.",
      },
      {
        type: "h3",
        text: "4. ¿Cumple con RGPD para datos de salud?",
      },
      {
        type: "p",
        text: "Los datos de pacientes son datos de salud conforme al artículo 9 del RGPD, categoría especial que requiere consentimiento explícito. El proveedor debe poder firmar un Acuerdo de Encargado de Tratamiento (DPA) y tener los datos en servidores dentro de la UE.",
      },
      {
        type: "h3",
        text: "5. ¿Cuánto tarda la configuración inicial?",
      },
      {
        type: "p",
        text: "Un setup que tarde más de 2 semanas o que requiera un consultor externo para funcionar no es una solución SaaS real. La configuración guiada basada en la web y servicios existentes de la clínica debe ser el punto de partida.",
      },
      {
        type: "h2",
        text: "Preguntas que deberías hacer antes de contratar",
      },
      {
        type: "ol",
        items: [
          "¿Puedo probar el agente con pacientes reales antes de pagar?",
          "¿Cómo se configura el sistema si cambian mis servicios o profesionales?",
          "¿Qué ocurre si el agente no sabe responder algo?",
          "¿Puedo ver todas las conversaciones y qué dijo el agente?",
          "¿Qué datos recoge y dónde se almacenan?",
          "¿Hay permanencia mínima o puedo cancelar cuando quiera?",
        ],
      },
      {
        type: "cta",
        ctaText: "Probar Atiende360 gratis 7 días",
        ctaHref: "/demo",
      },
    ],
  },
  {
    slug: "como-automatizar-recordatorios-citas-clinica",
    title: "Cómo automatizar los recordatorios de citas en tu clínica sin herramientas complejas",
    seoTitle: "Recordatorios de citas automáticos",
    seoDescription:
      "Cómo implantar recordatorios automáticos por SMS y WhatsApp en una clínica: plantillas, momento de envío y cómo medir el impacto.",
    description:
      "Guía práctica para implementar recordatorios automáticos de citas en clínicas privadas por SMS y WhatsApp. Plantillas de mensajes, timing óptimo y cómo medir el impacto.",
    date: "2026-05-05",
    category: "Automatización",
    readingTime: 6,
    keywords: [
      "recordatorios automáticos citas clínica",
      "sms recordatorio clínica",
      "whatsapp recordatorio médico",
      "automatización agenda clínica",
      "confirmación cita automática",
    ],
    content: [
      {
        type: "p",
        text: "Los recordatorios de citas son la intervención más sencilla y con mejor retorno de la gestión de pacientes. Un SMS o mensaje de WhatsApp enviado 24 horas antes puede reducir los no-shows entre un 20% y un 40%, sin coste adicional por cita y con mínima fricción para el paciente. El problema no es que las clínicas no sepan que los recordatorios funcionan, sino que implementarlos de forma consistente y automática es más difícil de lo que parece cuando se hace manualmente.",
      },
      {
        type: "h2",
        text: "El problema con los recordatorios manuales",
      },
      {
        type: "p",
        text: "Muchas clínicas envían recordatorios, pero de forma irregular: cuando hay tiempo, solo para citas largas, o solo cuando la recepcionista lo recuerda. Esta inconsistencia hace que el impacto sea marginal. Los recordatorios automáticos funcionan porque son sistemáticos: cada cita recibe su recordatorio, sin excepciones.",
      },
      {
        type: "h2",
        text: "Cuándo enviar cada recordatorio",
      },
      {
        type: "p",
        text: "El timing óptimo depende del tipo de cita y del paciente, pero hay un esquema que funciona bien para la mayoría de clínicas privadas en España:",
      },
      {
        type: "ul",
        items: [
          "Confirmación de reserva: inmediatamente al crear la cita, por cualquier canal.",
          "Primer recordatorio: 24 horas antes, con opción de confirmar o cancelar.",
          "Segundo recordatorio: 2 horas antes (opcional, recomendado para especialidades con alta tasa de no-show).",
          "Seguimiento post-cita: 24-48 horas después, para citas de seguimiento o en procesos de varias sesiones.",
        ],
      },
      {
        type: "h2",
        text: "Plantillas de mensajes que funcionan",
      },
      {
        type: "h3",
        text: "Recordatorio 24 horas antes (con confirmación activa)",
      },
      {
        type: "p",
        text: "«Hola [Nombre], te recordamos tu cita en [Clínica] mañana [día] a las [hora] con [Profesional]. Responde 1 para confirmar o 2 para cancelar. Si necesitas cambiar la fecha, responde 3.»",
      },
      {
        type: "p",
        text: "La clave es incluir la opción de cancelar en el mismo mensaje. Si el paciente no puede asistir y tiene una forma fácil de cancelar, lo hará. Si tiene que llamar, probablemente no lo hará.",
      },
      {
        type: "h3",
        text: "Recordatorio 2 horas antes",
      },
      {
        type: "p",
        text: "«[Nombre], tu cita en [Clínica] es hoy a las [hora]. ¡Te esperamos! Si necesitas llegar 5 minutos antes para el registro, perfecto. Para cualquier cambio de última hora, llámanos al [teléfono].»",
      },
      {
        type: "h2",
        text: "SMS vs WhatsApp: cuál elegir para recordatorios",
      },
      {
        type: "p",
        text: "En España, WhatsApp tiene una tasa de apertura superior al 90%, muy por encima del SMS (70-80%). Sin embargo, enviar mensajes de WhatsApp de empresa a cliente requiere que el paciente haya iniciado conversación primero (ventana de 24h) o que se usen plantillas aprobadas por Meta, lo que añade complejidad y tiempo de aprobación.",
      },
      {
        type: "p",
        text: "Para recordatorios automáticos, el SMS sigue siendo la opción más fiable y directa: funciona sin ningún requisito previo, llega a cualquier teléfono y no depende de que el paciente tenga WhatsApp instalado o activado. El coste en España está entre €0,04 y €0,08 por SMS, lo que lo hace muy rentable frente al coste de un no-show.",
      },
      {
        type: "h2",
        text: "Cómo medir si los recordatorios están funcionando",
      },
      {
        type: "ul",
        items: [
          "Tasa de confirmación: porcentaje de citas que el paciente confirma activamente.",
          "Tasa de no-show: citas no atendidas sin comunicación previa, antes y después.",
          "Tasa de cancelación con antelación: cuántas cancelaciones se reciben con >12 horas de margen.",
          "Huecos cubiertos por lista de espera: cuántas cancelaciones se convierten en citas nuevas.",
        ],
      },
      {
        type: "h2",
        text: "Automatización sin configuración compleja",
      },
      {
        type: "p",
        text: "La alternativa a montar un sistema de recordatorios propio (que requiere integración con la agenda, proveedor de SMS, lógica de timing y gestión de respuestas) es usar un sistema de recepción inteligente que incluya esta funcionalidad como parte del servicio. Así los recordatorios se configuran una vez —junto con los servicios, profesionales y reglas de agenda— y funcionan automáticamente.",
      },
      {
        type: "cta",
        ctaText: "Ver cómo funciona Atiende360",
        ctaHref: "/#como-funciona",
      },
    ],
  },
  {
    slug: "software-agenda-clinica-fisioterapia-rehabilitacion",
    title: "Software de agenda para clínicas de fisioterapia: qué buscar y qué evitar",
    seoTitle: "Software de agenda para fisioterapia",
    seoDescription:
      "Sesiones frecuentes, varios profesionales y pacientes recurrentes: qué funcionalidades de agenda son imprescindibles y cuáles sobran.",
    description:
      "Las clínicas de fisioterapia y rehabilitación tienen necesidades específicas de agenda: sesiones frecuentes, múltiples profesionales y pacientes recurrentes. Qué funcionalidades son esenciales.",
    date: "2026-05-01",
    category: "Gestión de citas",
    readingTime: 7,
    keywords: [
      "software agenda fisioterapia",
      "gestión citas rehabilitación",
      "agenda online clínica fisio",
      "software recepción fisioterapia",
      "automatización citas fisioterapia",
    ],
    content: [
      {
        type: "p",
        text: "Las clínicas de fisioterapia y rehabilitación tienen características que las diferencian de otras clínicas privadas y que afectan directamente a cómo deben gestionar su agenda. Los pacientes vienen varias veces por semana durante semanas o meses, trabajan con el mismo profesional, y el volumen de cambios de cita es alto porque las mejoras o recaídas del paciente condicionan el ritmo del tratamiento. Un software de agenda genérico puede no estar preparado para esta operativa.",
      },
      {
        type: "h2",
        text: "Las necesidades específicas de fisio y rehabilitación",
      },
      {
        type: "h3",
        text: "Alta frecuencia de citas por paciente",
      },
      {
        type: "p",
        text: "Un paciente en tratamiento puede tener 3 citas por semana durante 6 semanas. Gestionar manualmente cada recordatorio, cada cambio y cada confirmación es inviable con volúmenes altos. El sistema debe permitir configurar series de citas recurrentes y gestionar recordatorios automáticamente.",
      },
      {
        type: "h3",
        text: "Múltiples profesionales con disponibilidades distintas",
      },
      {
        type: "p",
        text: "En una clínica de fisio mediana es frecuente tener 3-6 fisioterapeutas con horarios distintos, días libres diferentes y especializaciones que condicionan qué pacientes pueden atender. La agenda debe poder filtrar disponibilidad por profesional y mostrar huecos reales según quién puede atender cada caso.",
      },
      {
        type: "h3",
        text: "Cambios de cita frecuentes",
      },
      {
        type: "p",
        text: "La fisioterapia tiene una tasa de cambios de cita superior a la media porque el estado del paciente varía: una semana está mejor y puede venir más, otra tiene una recaída y necesita cancelar. El sistema debe permitir cambios rápidos sin fricción, tanto para el paciente como para recepción.",
      },
      {
        type: "h3",
        text: "Pacientes recurrentes con historial",
      },
      {
        type: "p",
        text: "A diferencia de una clínica dental donde el paciente viene una o dos veces al año, en fisio el paciente puede tener 60 citas en un año. El sistema debe reconocer al paciente, recordar su historial de conversaciones y no tratarle como un lead nuevo cada vez que contacta.",
      },
      {
        type: "h2",
        text: "Funcionalidades esenciales para fisio y rehabilitación",
      },
      {
        type: "ul",
        items: [
          "Agenda por profesional con disponibilidad individual configurable.",
          "Recordatorios automáticos por SMS o WhatsApp antes de cada cita.",
          "Cambio y cancelación de citas sin necesidad de llamar.",
          "Reconocimiento de paciente recurrente con historial de conversaciones.",
          "Lista de espera para huecos de cancelación de última hora.",
          "Vista de agenda del día y semana por profesional.",
          "Escalado a humano cuando el paciente reporta síntomas nuevos o urgentes.",
        ],
      },
      {
        type: "h2",
        text: "Lo que no necesitas en fisio (aunque el proveedor te lo venda)",
      },
      {
        type: "ul",
        items: [
          "Un HIS completo de gestión clínica: para recepción y agenda, no es necesario.",
          "Integración con sistemas de facturación complejos desde el primer día.",
          "Panel de estadísticas avanzadas antes de tener un volumen suficiente.",
          "Un chatbot para diagnosticar o dar indicaciones clínicas.",
        ],
      },
      {
        type: "h2",
        text: "El canal de contacto importa: voz sigue siendo dominante",
      },
      {
        type: "p",
        text: "En fisio y rehabilitación, los pacientes suelen ser adultos de mediana edad o mayores que prefieren el teléfono al chat o WhatsApp. Esto hace que la atención de llamadas entrantes sea especialmente importante. Si el sistema de recepción solo gestiona chat o WhatsApp, cubrirá una parte del problema pero no el canal principal.",
      },
      {
        type: "p",
        text: "La IA de voz —un agente que atiende llamadas automáticamente, responde preguntas y propone citas disponibles— tiene un impacto mucho mayor en fisio que un chatbot web, precisamente porque el teléfono sigue siendo el canal preferido.",
      },
      {
        type: "h2",
        text: "Cómo elegir entre las opciones disponibles",
      },
      {
        type: "p",
        text: "Antes de contratar, comprueba que el sistema puede demostrar estas tres cosas: (1) una llamada de prueba real que proponga citas según disponibilidad, (2) un panel donde tu equipo vea las conversaciones y pueda intervenir, y (3) que el setup inicial no requiera más de una semana de trabajo. Si no puede demostrarte estos tres puntos, probablemente no sea la solución adecuada para tu clínica.",
      },
      {
        type: "cta",
        ctaText: "Probar Atiende360 gratis 7 días",
        ctaHref: "/demo",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
