import { Suspense } from "react";
import { signInWithGoogle } from "./actions";
import LoginError from "./LoginError";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; msg?: string }>;
}) {
  const params = await searchParams;
  const { token, error, msg } = params;

  // Si no hay error, disparar OAuth directamente sin pantalla intermedia
  if (!error) {
    await signInWithGoogle(token);
  }

  // Solo se llega aquí si hubo error en el OAuth
  return (
    <Suspense>
      <LoginError error={error} msg={msg} token={token} />
    </Suspense>
  );
}
