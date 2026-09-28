"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function finishOnboarding() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  await supabase.from("brand_profiles").upsert({
    user_id: data.claims.sub,
    onboarded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  redirect("/ideas");
}
