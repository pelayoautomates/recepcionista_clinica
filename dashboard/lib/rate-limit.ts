import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

function nowMs() {
  return Date.now();
}

export function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip") || "unknown";
}

export function enforceRateLimit(
  req: Request,
  keyPrefix: string,
  maxRequests: number,
  windowMs: number
): NextResponse | null {
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const now = nowMs();

  // Sin purga el Map crece sin limite mientras viva la instancia: cada IP nueva
  // deja una entrada muerta para siempre.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(k);
    }
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { detail: "Demasiadas solicitudes, intenta de nuevo en unos segundos." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  current.count += 1;
  buckets.set(key, current);
  return null;
}
