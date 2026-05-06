const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
const ADMIN_KEY = process.env.ADMIN_SECRET || "";

function adminHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { ...(extra as Record<string, string>) };
  if (ADMIN_KEY) headers["X-Admin-Key"] = ADMIN_KEY;
  return headers;
}

export async function adminFetch(
  path: string,
  opts: RequestInit & { noStore?: boolean } = {}
): Promise<Response> {
  const { noStore, ...fetchOpts } = opts;
  return fetch(`${BACKEND}${path}`, {
    ...fetchOpts,
    cache: noStore ? "no-store" : fetchOpts.cache,
    headers: adminHeaders(fetchOpts.headers as HeadersInit),
  });
}

export { BACKEND };
