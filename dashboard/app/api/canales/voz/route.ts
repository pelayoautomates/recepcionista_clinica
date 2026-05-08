import { adminFetch } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clinic_id, telefono, accion } = body; // accion: "conectar" | "comprar"

  if (!clinic_id || !telefono || !accion) {
    return NextResponse.json({ detail: "Faltan parámetros requeridos" }, { status: 400 });
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
  const body = await req.json();
  const { clinic_id } = body;

  if (!clinic_id) {
    return NextResponse.json({ detail: "Falta clinic_id" }, { status: 400 });
  }

  const res = await adminFetch(
    `/admin/clinicas/${clinic_id}/canales/voz`,
    { method: "DELETE" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
