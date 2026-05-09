import { adminFetch } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const throttle = enforceRateLimit(req, "canales-voz-post", 30, 60_000);
  if (throttle) return throttle;

  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const body = await req.json();
  const { clinic_id, telefono, accion } = body; // accion: "conectar" | "comprar"
  const accionesValidas = new Set(["conectar", "comprar"]);

  if (!clinic_id || !telefono || !accion) {
    return NextResponse.json({ detail: "Faltan parámetros requeridos" }, { status: 400 });
  }
  const scopeError = enforceClinicScope(access, clinic_id);
  if (scopeError) return scopeError;
  if (!accionesValidas.has(accion)) {
    return NextResponse.json({ detail: "Accion no permitida" }, { status: 400 });
  }

  const res = await adminFetch(
    `/admin/clinicas/${clinic_id}/canales/voz/${accion}`,
    {
      method: "POST",
      body: JSON.stringify({ telefono }),
      headers: { "Content-Type": "application/json" },
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: NextRequest) {
  const throttle = enforceRateLimit(req, "canales-voz-delete", 20, 60_000);
  if (throttle) return throttle;

  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const body = await req.json();
  const { clinic_id } = body;

  if (!clinic_id) {
    return NextResponse.json({ detail: "Falta clinic_id" }, { status: 400 });
  }
  const scopeError = enforceClinicScope(access, clinic_id);
  if (scopeError) return scopeError;

  const res = await adminFetch(
    `/admin/clinicas/${clinic_id}/canales/voz`,
    { method: "DELETE" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
