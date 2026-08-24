export type City = {
  slug: string;
  name: string;
  /** Nombre para titulares: "en Madrid", "en A Coruña" */
  inName: string;
  province: string;
  region: string;
  postalPrefix: string;
  lat: number;
  lng: number;
  /** Barrios / zonas con mayor densidad de clínicas privadas */
  districts: string[];
  /** Especialidades con más peso en el tejido privado local */
  sectors: string[];
  /** Contexto real del mercado local */
  context: string;
  /** Patrón horario típico que condiciona la recepción */
  schedule: string;
  /** Pregunta frecuente específica de la plaza */
  localFaq: { q: string; a: string };
};

export const CITIES: City[] = [
  {
    slug: "madrid",
    name: "Madrid",
    inName: "en Madrid",
    province: "Madrid",
    region: "Comunidad de Madrid",
    postalPrefix: "28",
    lat: 40.4168,
    lng: -3.7038,
    districts: ["Salamanca", "Chamberí", "Chamartín", "Retiro", "Moncloa-Aravaca", "Las Rozas"],
    sectors: ["medicina estética", "odontología", "fisioterapia", "psicología", "dermatología"],
    context:
      "Madrid concentra la mayor densidad de clínicas privadas de España y también la competencia más agresiva por el mismo paciente: una primera consulta de estética o dental suele contactar con tres o cuatro centros el mismo día. Quien responde primero se queda la valoración. En zonas como Salamanca o Chamberí, con agendas llenas y recepciones de una sola persona, la llamada perdida a media mañana es la fuga de ingresos más silenciosa.",
    schedule:
      "Jornada partida muy extendida (10:00-14:00 y 16:00-20:30) y un pico de llamadas entre las 14:00 y las 16:00, justo cuando la recepción está cerrada.",
    localFaq: {
      q: "¿Atiende360 funciona para una clínica con varias sedes en Madrid?",
      a: "Sí. Cada sede se configura como una unidad con su propio horario, servicios, profesionales y calendario, y el agente enruta al paciente a la sede que le encaja por zona o disponibilidad. El panel muestra las conversaciones y citas separadas por sede.",
    },
  },
  {
    slug: "barcelona",
    name: "Barcelona",
    inName: "en Barcelona",
    province: "Barcelona",
    region: "Cataluña",
    postalPrefix: "08",
    lat: 41.3874,
    lng: 2.1686,
    districts: ["Eixample", "Sarrià-Sant Gervasi", "Gràcia", "Les Corts", "Sant Cugat"],
    sectors: ["medicina estética", "odontología", "fisioterapia deportiva", "reproducción asistida"],
    context:
      "Barcelona combina un tejido de clínicas privadas muy consolidado con un volumen alto de paciente internacional y de proximidad. Eso multiplica los contactos fuera de horario y en varios idiomas. En el Eixample y Sarrià-Sant Gervasi la primera consulta se decide por rapidez de respuesta más que por precio.",
    schedule:
      "Horario continuo cada vez más habitual (9:00-20:00) pero con recepción rotando entre sala y teléfono, lo que genera llamadas sin coger en franjas de alta ocupación.",
    localFaq: {
      q: "¿El agente puede atender en catalán además de en castellano?",
      a: "El agente responde en el idioma en el que escribe o habla el paciente, incluido el catalán. La configuración de la clínica define el idioma por defecto del saludo y de las confirmaciones de cita.",
    },
  },
  {
    slug: "valencia",
    name: "Valencia",
    inName: "en Valencia",
    province: "Valencia",
    region: "Comunitat Valenciana",
    postalPrefix: "46",
    lat: 39.4699,
    lng: -0.3763,
    districts: ["Eixample", "Pla del Real", "Campanar", "Ciutat Vella"],
    sectors: ["odontología", "medicina estética", "fisioterapia", "nutrición"],
    context:
      "Valencia ha visto crecer con fuerza las clínicas estéticas y dentales de tamaño medio, con equipos de dos o tres profesionales y una única persona en recepción. Ese modelo es exactamente el que más llamadas pierde: cuando la recepcionista está cobrando o acompañando a un paciente, el teléfono queda sin cubrir.",
    schedule:
      "Jornada partida con cierre largo al mediodía y mucha actividad de WhatsApp entre las 15:00 y las 17:00.",
    localFaq: {
      q: "¿Puedo conservar el número fijo de la clínica en Valencia?",
      a: "Sí. Atiende360 se activa por desvío por no respuesta sobre tu numeración actual, así que el paciente sigue marcando el mismo número de siempre y la IA solo entra cuando nadie descuelga.",
    },
  },
  {
    slug: "sevilla",
    name: "Sevilla",
    inName: "en Sevilla",
    province: "Sevilla",
    region: "Andalucía",
    postalPrefix: "41",
    lat: 37.3891,
    lng: -5.9845,
    districts: ["Nervión", "Los Remedios", "Triana", "Sevilla Este"],
    sectors: ["odontología", "medicina estética", "fisioterapia", "podología"],
    context:
      "En Sevilla el paciente privado sigue prefiriendo el teléfono sobre el formulario web, lo que hace que la llamada no atendida pese más que en otras plazas. Las clínicas de Nervión y Los Remedios trabajan con agendas muy estacionales, con picos claros antes de verano y de Feria.",
    schedule:
      "Jornada partida marcada, con cierre al mediodía más largo en verano y desplazamiento de llamadas a primera hora de la tarde.",
    localFaq: {
      q: "¿Sirve para una clínica con mucha estacionalidad?",
      a: "Sí, y es donde más se nota: en los picos de campaña el agente absorbe el exceso de llamadas y mensajes sin que tengas que contratar refuerzo, y en meses valle simplemente cubre los huecos de recepción.",
    },
  },
  {
    slug: "malaga",
    name: "Málaga",
    inName: "en Málaga",
    province: "Málaga",
    region: "Andalucía",
    postalPrefix: "29",
    lat: 36.7213,
    lng: -4.4214,
    districts: ["Centro", "Teatinos", "El Limonar", "Marbella", "Estepona"],
    sectors: ["medicina estética", "odontología", "cirugía plástica", "fisioterapia"],
    context:
      "La Costa del Sol tiene una proporción muy alta de paciente extranjero y residente temporal, que contacta fuera del horario español y espera respuesta inmediata. Muchas clínicas de Málaga y Marbella pierden primeras consultas simplemente por diferencia horaria o por mensajes de fin de semana sin contestar.",
    schedule:
      "Alta actividad de contacto en fines de semana y por la tarde-noche, sobre todo en la franja de Marbella y Estepona.",
    localFaq: {
      q: "¿Puede atender a pacientes que escriben en inglés?",
      a: "Sí. El agente detecta el idioma del paciente y responde en él, manteniendo la información de servicios y horarios de tu clínica. Las citas se registran igualmente en tu calendario en horario local.",
    },
  },
  {
    slug: "zaragoza",
    name: "Zaragoza",
    inName: "en Zaragoza",
    province: "Zaragoza",
    region: "Aragón",
    postalPrefix: "50",
    lat: 41.6488,
    lng: -0.8891,
    districts: ["Centro", "Universidad", "Actur", "Delicias"],
    sectors: ["odontología", "fisioterapia", "psicología", "medicina estética"],
    context:
      "Zaragoza es una plaza de clínicas medianas con equipos estables y agendas muy densas de revisiones y sesiones de tratamiento. El coste real no es la llamada nueva perdida, sino el cambio de cita que nadie gestiona y acaba en hueco vacío.",
    schedule:
      "Jornada partida clásica, con concentración de cambios y cancelaciones a primera hora de la mañana.",
    localFaq: {
      q: "¿Gestiona cambios y cancelaciones de cita, no solo altas?",
      a: "Sí. El agente puede mover o cancelar citas dentro de las reglas de disponibilidad que definas y deja registrado en el panel quién pidió el cambio y cuándo, para que el hueco se pueda reofrecer.",
    },
  },
  {
    slug: "bilbao",
    name: "Bilbao",
    inName: "en Bilbao",
    province: "Bizkaia",
    region: "País Vasco",
    postalPrefix: "48",
    lat: 43.263,
    lng: -2.935,
    districts: ["Abando", "Indautxu", "Deusto", "Getxo"],
    sectors: ["odontología", "fisioterapia", "psicología", "medicina estética"],
    context:
      "En Bilbao y el entorno de Getxo predominan las clínicas con marca personal fuerte y pacientes recurrentes. Ahí la exigencia no es solo contestar, sino contestar con el tono de la casa: una respuesta genérica daña más que ayuda.",
    schedule:
      "Horario continuo frecuente en el centro y jornada partida en la margen derecha, con picos de mensajes a última hora de la tarde.",
    localFaq: {
      q: "¿Puedo controlar el tono con el que responde el agente?",
      a: "Sí. El tono, el saludo y los límites de lo que puede o no puede decir se configuran por clínica. Además, cualquier consulta clínica sensible se deriva a tu equipo en lugar de improvisar una respuesta.",
    },
  },
  {
    slug: "murcia",
    name: "Murcia",
    inName: "en Murcia",
    province: "Murcia",
    region: "Región de Murcia",
    postalPrefix: "30",
    lat: 37.9922,
    lng: -1.1307,
    districts: ["Centro", "La Flota", "Juan Carlos I", "Espinardo"],
    sectors: ["odontología", "medicina estética", "oftalmología", "fisioterapia"],
    context:
      "Murcia tiene una concentración notable de clínicas dentales y oftalmológicas que compiten con campañas de captación. Cuando la campaña genera picos de llamadas, la recepción se satura y buena parte de la inversión publicitaria se pierde en el teléfono.",
    schedule:
      "Jornada partida y fuerte concentración de llamadas los lunes y tras cada oleada de campaña.",
    localFaq: {
      q: "¿Aguanta un pico de llamadas por una campaña publicitaria?",
      a: "Sí. El agente atiende contactos en paralelo, así que un pico de campaña no genera cola. Cada contacto queda registrado como lead con su motivo, aunque no acabe en cita en ese momento.",
    },
  },
  {
    slug: "alicante",
    name: "Alicante",
    inName: "en Alicante",
    province: "Alicante",
    region: "Comunitat Valenciana",
    postalPrefix: "03",
    lat: 38.3452,
    lng: -0.481,
    districts: ["Centro", "Playa de San Juan", "Elche", "Benidorm"],
    sectors: ["odontología", "medicina estética", "fisioterapia", "dermatología"],
    context:
      "Como en la Costa del Sol, en Alicante y Benidorm el paciente internacional y el residente estacional generan contactos fuera de horario. A eso se suma una fuerte competencia dental con precios muy visibles, donde la velocidad de respuesta decide la valoración.",
    schedule:
      "Estacionalidad marcada y volumen de contactos alto en fines de semana durante temporada.",
    localFaq: {
      q: "¿Qué pasa con los mensajes que llegan de madrugada o en festivo?",
      a: "Se atienden igual. El agente responde, propone huecos reales de tu agenda y deja la conversación registrada para que tu equipo la revise al abrir, sin que el paciente se quede sin respuesta.",
    },
  },
  {
    slug: "palma-de-mallorca",
    name: "Palma de Mallorca",
    inName: "en Palma de Mallorca",
    province: "Illes Balears",
    region: "Illes Balears",
    postalPrefix: "07",
    lat: 39.5696,
    lng: 2.6502,
    districts: ["Centre", "Son Armadans", "Portixol", "Calvià"],
    sectors: ["medicina estética", "odontología", "fisioterapia", "medicina deportiva"],
    context:
      "Palma trabaja con una mezcla de residente local y paciente internacional de alto poder adquisitivo, muy concentrada en temporada. Las clínicas suelen tener plantilla ajustada fuera de verano, así que el refuerzo estacional de recepción es caro y difícil de encontrar.",
    schedule:
      "Picos muy intensos de mayo a septiembre y caída fuerte en invierno.",
    localFaq: {
      q: "¿Puedo activarlo solo en temporada alta?",
      a: "El servicio no tiene permanencia, así que puedes ajustarlo a tu estacionalidad. La configuración de tu clínica se conserva, de modo que reactivarlo no implica volver a montar servicios ni horarios.",
    },
  },
  {
    slug: "las-palmas-de-gran-canaria",
    name: "Las Palmas de Gran Canaria",
    inName: "en Las Palmas de Gran Canaria",
    province: "Las Palmas",
    region: "Canarias",
    postalPrefix: "35",
    lat: 28.1235,
    lng: -15.4363,
    districts: ["Vegueta", "Triana", "Mesa y López", "Tafira"],
    sectors: ["odontología", "medicina estética", "fisioterapia", "dermatología"],
    context:
      "Canarias añade una capa que casi nadie contempla: el desfase horario con la Península. Un paciente que escribe a las 19:00 canarias contacta con una clínica que ya ha cerrado si el horario está mal configurado, y las agendas compartidas fallan por zona horaria.",
    schedule:
      "Horario canario, con una hora menos que la Península durante todo el año.",
    localFaq: {
      q: "¿Respeta el horario canario en las citas?",
      a: "Sí. La zona horaria se configura por clínica, de modo que las propuestas de hueco, las confirmaciones y la sincronización con Google Calendar se hacen siempre en hora local canaria.",
    },
  },
  {
    slug: "vigo",
    name: "Vigo",
    inName: "en Vigo",
    province: "Pontevedra",
    region: "Galicia",
    postalPrefix: "36",
    lat: 42.2406,
    lng: -8.7207,
    districts: ["Centro", "Teis", "Navia", "Castrelos"],
    sectors: ["odontología", "fisioterapia", "psicología", "medicina estética"],
    context:
      "En Vigo y su área metropolitana conviven clínicas de barrio con centros de referencia gallegos. El paciente es fiel pero exige cercanía, y una respuesta automática mal planteada se percibe rápido. La derivación a persona es aquí más determinante que en otras plazas.",
    schedule:
      "Jornada partida con cierre al mediodía y volumen alto de llamadas a primera hora.",
    localFaq: {
      q: "¿El paciente sabe que está hablando con una IA?",
      a: "Sí, el agente se identifica como asistente virtual desde el saludo. Es una decisión de producto y también un requisito de transparencia: nunca se hace pasar por una persona del equipo.",
    },
  },
];

export const CITY_SLUGS = CITIES.map((c) => c.slug);

export function getCity(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}
