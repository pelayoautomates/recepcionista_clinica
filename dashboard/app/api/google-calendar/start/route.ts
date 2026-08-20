import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/api";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const clinicId = req.nextUrl.searchParams.get("clinic_id") || "";
  const scopeError = enforceClinicScope(access, clinicId);
  if (scopeError) return scopeError;

  const secret = process.env.ADMIN_SECRET || "";
  if (!secret) {
    return NextResponse.json({ detail: "Google Calendar no configurado" }, { status: 503 });
  }

  const payload = Buffer.from(JSON.stringify({
    clinic_id: clinicId,
    user_id: access.userId,
    exp: Math.floor(Date.now() / 1000) + 300,
  })).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(Buffer.from(payload, "base64url"))
    .digest("hex");

  return NextResponse.redirect(
    `${BACKEND}/auth/google/${encodeURIComponent(clinicId)}?access=${encodeURIComponent(`${payload}.${signature}`)}`
  );
}
