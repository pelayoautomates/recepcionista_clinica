import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { enforceRateLimit } from "@/lib/rate-limit";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SCRAPE_TIMEOUT_MS = 8000;
const MAX_CONTENT_LENGTH = 2_000_000;

const DEMO_CLINIC_CONTEXT = `Clínica: Sonrisa Dental Madrid
Dirección: Calle Serrano 45, 1ºB, Madrid (barrio Salamanca)
Teléfono: 91 234 56 78
Horarios: Lunes a viernes 9:00-20:00, Sábados 9:00-14:00. Cerrado domingos y festivos.
Servicios: Revisión dental (30 min, 40€), Limpieza dental profesional (45 min, 80€), Blanqueamiento dental (60 min, 250€), Ortodoncia invisible (desde 2800€), Implantes dentales (desde 950€/unidad), Carillas de porcelana (800€/pieza), Endodoncia (desde 300€).
Profesionales: Dr. Carlos Vega (Director, especialista en implantes), Dra. Ana Ruiz (Ortodontista), Dra. Laura García (Odontología general y estética).
Próximos huecos disponibles (simulados): Martes 15:00, Miércoles 10:30, Jueves 11:00, Viernes 16:30.`;

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 0) return true;
  return false;
}

function isPrivateIpv6(ip: string) {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized === "::"
  );
}

function isBlockedIp(ip: string) {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

async function assertSafeTarget(url: URL) {
  const host = url.hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("Host no permitido");
  }

  if (isIP(host) && isBlockedIp(host)) {
    throw new Error("IP no permitida");
  }

  const resolved = await lookup(host, { all: true });
  if (!resolved.length || resolved.some((entry) => isBlockedIp(entry.address))) {
    throw new Error("Host resuelve a red privada o local");
  }
}

function sanitizeText(text: string) {
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function scrapeWebsite(url: string) {
  const parsed = new URL(url);
  await assertSafeTarget(parsed);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer la URL (${response.status})`);
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_CONTENT_LENGTH) {
    throw new Error("La URL devuelve demasiado contenido");
  }

  const html = await response.text();
  if (html.length > MAX_CONTENT_LENGTH) {
    throw new Error("La URL devuelve demasiado contenido");
  }

  return sanitizeText(html).slice(0, 12000);
}

export async function POST(req: NextRequest) {
  const throttle = enforceRateLimit(req, "demo-chat", 20, 60_000);
  if (throttle) return throttle;

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });
  }

  const {
    website,
    message,
    conversationId,
    cachedContext,
    history,
  } = await req.json();

  if (!website || typeof website !== "string") {
    return NextResponse.json({ error: "Falta website" }, { status: 400 });
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Falta message" }, { status: 400 });
  }

  const isDemo = website === "demo";

  // Validate URL unless it's the demo mode
  if (!isDemo) {
    try {
      const parsedWebsite = new URL(website);
      if (!(parsedWebsite.protocol === "http:" || parsedWebsite.protocol === "https:")) {
        throw new Error("Protocolo no valido");
      }
    } catch {
      return NextResponse.json({ error: "URL no valida" }, { status: 400 });
    }
  }

  try {
    // Resolve context: use cached, fictional demo, or scrape
    let context: string;
    if (cachedContext && typeof cachedContext === "string" && cachedContext.length > 0) {
      context = cachedContext;
    } else if (isDemo) {
      context = DEMO_CLINIC_CONTEXT;
    } else {
      context = await scrapeWebsite(website);
    }

    const parsedUrl = isDemo ? null : new URL(website);
    const contextLabel = isDemo ? "Clínica de ejemplo (Sonrisa Dental Madrid)" : parsedUrl!.hostname;

    // Build history messages (last ~8 exchanges)
    const historyMessages: ChatMessage[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history.slice(-8)) {
        if (msg.role === "user" || msg.role === "assistant") {
          historyMessages.push({ role: msg.role, content: String(msg.content) });
        }
      }
    }

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Eres la recepcionista virtual de una clínica. Responde en español, de forma natural y cercana.\n" +
          "Tu objetivo: atender al paciente, responder sus dudas sobre servicios/precios/horarios y cerrar citas.\n" +
          "Cuando el paciente quiera cita: pide nombre, teléfono y servicio deseado si no lo has preguntado aún.\n" +
          "Propón huecos concretos disponibles según el contexto de la clínica.\n" +
          "Sé breve (2-4 líneas máximo). Nunca inventes datos que no estén en el contexto.",
      },
      {
        role: "system",
        content: `CONTEXTO DE LA CLÍNICA (${contextLabel}):\n${context}`,
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
        : `web-${Date.now()}`;

    return NextResponse.json({
      reply,
      conversationId: nextConversationId,
      context,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudo generar la demo" }, { status: 500 });
  }
}
