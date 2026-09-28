"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error?.code === "email_not_confirmed") redirect("/login?error=sin-confirmar");
  if (error) redirect("/login?error=credenciales");
  redirect("/ideas");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { data, error } = await supabase.auth.signUp({
    ...credentials(formData),
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error?.code === "over_email_send_rate_limit") redirect("/login?error=espera");
  if (error?.code === "weak_password") redirect("/login?error=contrasena-debil");
  if (error) redirect("/login?error=registro");
  // Supabase no da error si el correo ya existe: devuelve un usuario sin identidades.
  if (data.user?.identities?.length === 0) redirect("/login?error=ya-existe");
  redirect("/login?mensaje=revisa-tu-correo");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
