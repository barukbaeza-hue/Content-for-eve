import { Page } from "@/components/shell/page";
import { Skeleton, StatSkeleton, VideoGridSkeleton } from "@/components/ui/skeleton";

// Mismo layout que Métricas: resumen, pestañas de red, cifras y rejilla de vídeos
export default function Loading() {
  return (
    <Page title="Métricas">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-8">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-4 w-64 rounded" />
            <Skeleton className="h-8 w-72" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <StatSkeleton key={i} detail />)}
          </div>
        </section>
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-4 w-44 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pb-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <StatSkeleton key={i} />)}
          </div>
          <VideoGridSkeleton />
        </section>
      </div>
    </Page>
  );
}
