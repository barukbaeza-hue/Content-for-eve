import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/shell/page";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { signDownload } from "@/lib/r2";
import { toLines, type Word } from "@/lib/subtitles";
import { createClient } from "@/lib/supabase/server";
import type { Platform } from "../actions";
import { Studio } from "./studio";

// Tramos del original que quedaron, llevados al tiempo del vídeo editado (uno detrás de otro)
function editedBlocks(raw: { start: number; end: number }[]) {
  return raw.reduce<{ start: number; end: number }[]>((blocks, s) => {
    const start = blocks.at(-1)?.end ?? 0;
    return [...blocks, { start, end: start + (s.end - s.start) }];
  }, []);
}

export default async function StudioPage({ params }: PageProps<"/videos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("videos")
    .select("id, title, edit_status, storage_path, clean_path, transcript, card, caption, platforms, tiktok_settings, duration_seconds")
    .eq("id", id)
    .maybeSingle();
  if (!video) notFound();

  const unavailable =
    video.edit_status !== "edited"
      ? "Este vídeo se está editando. Podrás abrirlo en el Studio cuando esté listo."
      : !video.clean_path
        ? "Este vídeo se editó antes de que existiera el Studio. Súbelo de nuevo para editarlo aquí."
        : null;
  if (unavailable) {
    return (
      <Page title={video.title} actions={
        <Link href="/videos" className={buttonClasses("ghost", "sm")}>
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          Vídeos
        </Link>
      }>
        <div className="mx-auto w-full max-w-2xl px-4 py-6"><Notice tone="danger">{unavailable}</Notice></div>
      </Page>
    );
  }

  const words = (video.transcript?.edited_words ?? []) as Word[];
  const segments = editedBlocks((video.transcript?.segments ?? []) as { start: number; end: number }[]);
  const duration = Number(video.duration_seconds) || segments.at(-1)?.end || words.at(-1)?.end || 1;
  const music = video.card?.edicion?.musica ?? null;

  return (
    <Studio
      video={{ id: video.id, title: video.title, titulo: video.card?.estilo?.titulo ?? null }}
      url={await signDownload(video.clean_path!)}
      lines={toLines(words)}
      segments={segments.length ? segments : [{ start: 0, end: duration }]}
      duration={duration}
      music={music ? { titulo: music.titulo, artistas: music.artistas ?? [] } : null}
      post={{
        caption: video.caption ?? "",
        platforms: (video.platforms ?? []) as Platform[],
        tiktok: video.tiktok_settings ?? null,
        duration: video.duration_seconds ?? null,
      }}
    />
  );
}
