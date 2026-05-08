import { adminFetch } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pais = searchParams.get("pais") || "ES";
  const area_code = searchParams.get("area_code") || "";

  const query = new URLSearchParams({ pais });
  if (area_code) query.set("area_code", area_code);

  const res = await adminFetch(`/admin/telnyx/numeros?${query.toString()}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
