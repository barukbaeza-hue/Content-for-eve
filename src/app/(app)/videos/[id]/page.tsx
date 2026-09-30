import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/shell/page";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { signDownload } from "@/lib/r2";
import { toLines, type Word } from "@/lib/subtitles";
import { createClient } from "@/lib/supabase/server";
import { SubtitleEditor } from "./subtitle-editor";

export default async function VideoPage({ params }: PageProps<"/videos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("videos")
    .select("id, title, edit_status, edit_job, storage_path, clean_path, transcript")
    .eq("id", id)
    .maybeSingle();
  if (!video) notFound();

  const back = (
    <Link href="/videos" className={buttonClasses("ghost", "sm")}>
      <ChevronLeft className="size-4" strokeWidth={1.75} />
      Vídeos
    </Link>
  );

  const busy = video.edit_status !== "edited";
  const words = (video.transcript?.edited_words ?? []) as Word[];

  return (
    <Page title={video.title} actions={back}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        {busy ? (
          <Notice tone="danger">Este vídeo se está editando. Podrás corregir los subtítulos cuando esté listo.</Notice>
        ) : !video.clean_path ? (
          <Notice tone="danger">Este vídeo se editó antes de poder corregir subtítulos. Súbelo de nuevo para corregirlos.</Notice>
        ) : (
          <SubtitleEditor id={video.id} url={await signDownload(video.storage_path)} lines={toLines(words)} />
        )}
      </div>
    </Page>
  );
}
