import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const VALERIA_CONTEXT = `Nombre: Valeria
Clínica: Clínica Estética Luna
Dirección: Calle Velázquez 28, 2ºA, Madrid (barrio Salamanca)
Teléfono: 91 456 78 90
Horarios: Lunes a viernes 9:00-20:00, Sábados 10:00-15:00. Cerrado domingos y festivos.
Servicios disponibles:
- Limpieza facial profunda: 60 min, 75€
- Tratamiento antimanchas: 45 min, 120€
- Botox (por zona): desde 180€/zona
- Relleno de labios con ácido hialurónico: 250€
- Mesoterapia facial: 90 min, 150€
- Peeling químico: 30 min, 95€
- Micropigmentación de cejas: 2h, 320€
Profesionales: Dra. Sofía Romero (Directora médica, especialista en medicina estética), Dra. Carmen Vidal (Experta en tratamientos faciales y láser).
Huecos disponibles esta semana: mañana a las 10:30, 12:00 y 17:00 — pasado mañana a las 9:30, 11:00, 15:30 y 18:00.`;

export async function POST(req: NextRequest) {
  const throttle = enforceRateLimit(req, "demo-chat", 20, 60_000);
  if (throttle) return throttle;

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });
  }

  const { message, conversationId, history } = await req.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Falta message" }, { status: 400 });
  }

  // La demo es publica: sin tope de caracteres cualquiera puede convertirla en
  // un proxy de OpenAI a nuestra cuenta enviando prompts enormes.
  const MAX_MESSAGE_CHARS = 1000;
  const MAX_HISTORY_CHARS = 800;
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: "Mensaje demasiado largo" }, { status: 413 });
  }

  try {
    const historyMessages: ChatMessage[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history.slice(-8)) {
        if (msg.role === "user" || msg.role === "assistant") {
          historyMessages.push({
            role: msg.role,
            content: String(msg.content).slice(0, MAX_HISTORY_CHARS),
          });
        }
      }
    }

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Tu nombre es Valeria y eres la asistente virtual con inteligencia artificial de Clínica Estética Luna en Madrid. Nunca ocultes que eres una IA.\n" +
          "Responde siempre en español, con tono cálido, profesional y cercano.\n" +
          "Tu objetivo: atender al paciente, resolver dudas sobre servicios/precios/horarios y gestionar citas.\n" +
          "Cuando el paciente quiera pedir cita: pregunta nombre, teléfono y tratamiento deseado si no los tienes. Propón huecos concretos del contexto.\n" +
          "Si te preguntan algo que no tiene que ver con la clínica (política, tecnología, etc.), responde educadamente que solo puedes ayudar con temas de la clínica.\n" +
          "Sé breve (2-4 líneas máximo). Nunca inventes datos que no estén en el contexto.",
      },
      {
        role: "system",
        content: `CONTEXTO DE LA CLÍNICA:\n${VALERIA_CONTEXT}`,
      },
      ...historyMessages,
      {
        role: "user",
        content: message,
      },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
        max_tokens: 240,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Error OpenAI: ${err}` }, { status: 502 });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "No se pudo generar respuesta.";

    const nextConversationId =
      typeof conversationId === "string" && conversationId.trim().length > 0
        ? conversationId
        : `demo-${Date.now()}`;

    return NextResponse.json({ reply, conversationId: nextConversationId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
