import { Page } from "@/components/shell/page";
import { Skeleton, VideoGridSkeleton } from "@/components/ui/skeleton";

// Mismo layout que Vídeos: subida arriba y el banco en rejilla
export default function Loading() {
  return (
    <Page title="Vídeos">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-44 rounded" />
            <Skeleton className="h-4 w-96 max-w-full rounded" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <section className="space-y-3">
          <Skeleton className="h-4 w-40 rounded" />
          <VideoGridSkeleton />
        </section>
      </div>
    </Page>
  );
}
