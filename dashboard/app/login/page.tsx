import { Suspense } from "react";
import LoginError from "./LoginError";
import AutoLogin from "./AutoLogin";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; msg?: string }>;
}) {
  const params = await searchParams;
  const { token, error, msg } = params;

  if (!error) {
    // Auto-submit via client component so the server action runs correctly
    // and Supabase PKCE cookies are set before the redirect
    return <AutoLogin token={token} />;
  }

  return (
    <Suspense>
      <LoginError error={error} msg={msg} token={token} />
    </Suspense>
  );
}
