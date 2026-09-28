"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error) redirect("/login?error=credenciales");
  redirect("/ideas");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { error } = await supabase.auth.signUp({
    ...credentials(formData),
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/login?error=registro");
  redirect("/login?mensaje=revisa-tu-correo");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
