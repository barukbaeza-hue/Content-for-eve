import { Page } from "@/components/shell/page";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays } from "lucide-react";
import { r2Configured, signDownload } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { Planner, type CalendarVideo } from "./planner";

// Lo publicado se muestra durante dos meses
function publishedSince() {
  return new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
}

export default async function CalendarioPage() {
  if (!r2Configured()) {
    return (
      <Page title="Calendario">
        <EmptyState icon={CalendarDays} title="Almacenamiento no configurado"
          description="Faltan las claves de Cloudflare R2 en Vercel para ver tus vídeos." />
      </Page>
    );
  }

  const supabase = await createClient();
  const since = publishedSince();
  const [{ data: rows }, { data: brand }] = await Promise.all([
    // El banco (listos), lo programado y lo publicado en los últimos dos meses
    supabase
      .from("videos")
      .select("id, title, status, platforms, storage_path, duration_seconds, scheduled_at, published_at, position")
      .eq("edit_status", "edited")
      .or(`status.in.(ready,scheduled),published_at.gte.${since}`)
      .order("position")
      .limit(300),
    supabase.from("brand_profiles").select("posts_per_day, post_times").maybeSingle(),
  ]);

  const videos: CalendarVideo[] = await Promise.all(
    (rows ?? [])
      .filter((v) => v.status === "ready" || v.status === "scheduled" || v.status === "published")
      .map(async (v) => ({
        id: v.id,
        title: v.title,
        status: v.status as CalendarVideo["status"],
        url: await signDownload(v.storage_path),
        duration: v.duration_seconds,
        platforms: v.platforms ?? ["instagram", "tiktok"],
        at: v.status === "published" ? v.published_at : v.status === "scheduled" ? v.scheduled_at : null,
      })),
  );

  const perDay = brand?.posts_per_day ?? 1;
  const times = (brand?.post_times?.length ? brand.post_times : ["12:00", "19:00", "21:00"]) as string[];

  return (
    <Page title="Calendario">
      <Planner videos={videos} perDay={perDay} times={times} />
    </Page>
  );
}
