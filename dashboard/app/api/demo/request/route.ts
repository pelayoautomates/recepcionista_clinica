import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";

async function sendMetaLead(req: NextRequest, body: Record<string, any>) {
  if (req.cookies.get("a360_marketing")?.value !== "granted") return;
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CONVERSIONS_API_TOKEN;
  const graphVersion = process.env.META_GRAPH_VERSION;
  if (!pixelId || !token || !graphVersion || !body.meta_event_id) return;

  const email = String(body.email || "").trim().toLowerCase();
  const em = email ? createHash("sha256").update(email).digest("hex") : undefined;
  let sourceUrl = "https://atiende360.com/demo";
  try {
    const candidate = new URL(String(body.attribution?.landing_page || sourceUrl));
    if (candidate.protocol === "https:" && (candidate.hostname === "atiende360.com" || candidate.hostname.endsWith(".atiende360.com"))) {
      sourceUrl = `${candidate.origin}${candidate.pathname}`;
    }
  } catch { /* usar URL segura por defecto */ }
  const clientIp = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") || undefined;
  try {
    await fetch(`https://graph.facebook.com/${graphVersion}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: String(body.meta_event_id).slice(0, 120),
        action_source: "website",
        event_source_url: sourceUrl,
        user_data: {
          ...(em ? { em: [em] } : {}),
          ...(clientIp ? { client_ip_address: clientIp } : {}),
          ...(userAgent ? { client_user_agent: userAgent } : {}),
          ...(body.attribution?.fbp ? { fbp: String(body.attribution.fbp).slice(0, 255) } : {}),
          ...(body.attribution?.fbc ? { fbc: String(body.attribution.fbc).slice(0, 255) } : {}),
        },
      }] }),
      cache: "no-store",
    });
  } catch {
    // La analítica nunca debe impedir registrar el lead comercial.
  }
}

export async function POST(req: NextRequest) {
  const throttle = enforceRateLimit(req, "demo-request", 5, 60 * 60_000);
  if (throttle) return throttle;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.clinic_name !== "string" || typeof body.email !== "string") {
    return NextResponse.json({ detail: "Faltan los datos obligatorios" }, { status: 400 });
  }

  const res = await adminFetch("/saas/demo-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ detail: "No se pudo registrar la solicitud" }));
  if (res.ok) await sendMetaLead(req, body);
  return NextResponse.json(data, { status: res.status });
}
