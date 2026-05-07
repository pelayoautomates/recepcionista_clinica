import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada en Vercel" }, { status: 500 });
  }

  const { mensajes } = await req.json();
  if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
    return NextResponse.json({ error: "Sin mensajes" }, { status: 400 });
  }

  const conversacionTexto = mensajes
    .map((m: { role: string; content: string }) =>
      `${m.role === "user" ? "Paciente" : "Recepcionista IA"}: ${m.content}`
    )
    .join("\n");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente médico. Resume en 2-3 frases en español la siguiente conversación entre un paciente y una recepcionista IA de clínica. Incluye: intención del paciente, servicios o citas mencionadas, y resultado de la conversación. Sé conciso y directo.",
        },
        { role: "user", content: conversacionTexto },
      ],
      max_tokens: 220,
      temperature: 0.3,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return NextResponse.json({ error: `Error OpenAI: ${err}` }, { status: 502 });
  }

  const data = await resp.json();
  const resumen = data.choices?.[0]?.message?.content?.trim() || "No se pudo generar el resumen.";
  return NextResponse.json({ resumen });
}
