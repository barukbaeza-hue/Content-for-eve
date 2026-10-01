import { Page } from "@/components/shell/page";
import { Skeleton, StatSkeleton, VideoGridSkeleton } from "@/components/ui/skeleton";

// Mismo layout que Métricas: resumen con filtro y periodo, sus seis cifras, y los vídeos con su orden
export default function Loading() {
  return (
    <Page title="Métricas">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-8">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-4 w-72 rounded" />
            <Skeleton className="h-8 w-72" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <StatSkeleton key={i} detail={i < 3} />)}
          </div>
        </section>
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-4 w-40 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-8 w-36" />
            </div>
          </div>
          <VideoGridSkeleton />
        </section>
      </div>
    </Page>
  );
}
