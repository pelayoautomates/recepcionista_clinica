"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signInWithGoogle(token?: string) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const redirectTo = `${origin}/auth/callback${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=oauth_failed&msg=${encodeURIComponent(error?.message ?? "unknown")}`);
  }

  redirect(data.url);
}
