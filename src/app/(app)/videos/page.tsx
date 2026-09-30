import { Clapperboard } from "lucide-react";
import { Page } from "@/components/shell/page";
import { EmptyState } from "@/components/ui/empty-state";
import { r2Configured, signDownload } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { Uploader } from "./uploader";
import { VideoList, type VideoItem } from "./video-list";

export default async function VideosPage() {
  if (!r2Configured()) {
    return (
      <Page title="Vídeos">
        <EmptyState icon={Clapperboard} title="Almacenamiento no configurado"
          description="Faltan las claves de Cloudflare R2 en Vercel para poder subir vídeos." />
      </Page>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("id, title, edit_status, edit_job, edit_error, duration_seconds, storage_path, clean_path, status, scheduled_at, created_at, caption, platforms, publications(platform, status, permalink, error)")
    .order("created_at", { ascending: false })
    .limit(60);

  const videos: VideoItem[] = await Promise.all(
    (data ?? []).map(async (v) => {
      const ready = v.edit_status === "edited" && v.storage_path;
      return {
        id: v.id,
        title: v.title,
        editStatus: v.edit_status,
        job: v.edit_job,
        error: v.edit_error,
        duration: v.duration_seconds,
        url: ready ? await signDownload(v.storage_path) : null,
        downloadUrl: ready ? await signDownload(v.storage_path, `${v.title}.mp4`) : null,
        canEditSubtitles: Boolean(v.clean_path),
        scheduledAt: v.status === "scheduled" ? v.scheduled_at : null,
        caption: v.caption ?? "",
        platforms: v.platforms ?? ["instagram", "tiktok"],
        publications: v.publications ?? [],
        published: v.status === "published",
        createdAt: v.created_at,
      };
    }),
  );
  const ready = videos.filter((v) => v.editStatus === "edited").length;

  return (
    <Page title="Vídeos">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-8">
        <Uploader />
        {videos.length === 0 ? (
          <EmptyState icon={Clapperboard} title="Tu banco de vídeos está vacío"
            description="Sube tus vídeos grabados. Mova los edita y aparecen aquí listos para publicar." />
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-fg-2">
              Banco de vídeos <span className="text-fg-4">· {ready} {ready === 1 ? "listo" : "listos"}</span>
            </h2>
            <VideoList videos={videos} />
          </section>
        )}
      </div>
    </Page>
  );
}
