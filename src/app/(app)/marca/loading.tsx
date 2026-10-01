import { Page } from "@/components/shell/page";
import { Skeleton } from "@/components/ui/skeleton";

// Mismo layout que Mi marca: título, análisis, redes y formulario
export default function Loading() {
  return (
    <Page title="Mi marca">
      <div className="mx-auto w-full max-w-xl space-y-10 px-6 py-10">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64 rounded" />
          <Skeleton className="h-4 w-full rounded" />
        </div>
        <div className="space-y-4 rounded-lg border border-line bg-surface-2 p-5">
          <Skeleton className="h-4 w-3/4 rounded bg-surface-3" />
          <Skeleton className="h-9 w-48 bg-surface-3" />
        </div>
        <section className="space-y-3">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <div className="divide-y divide-line rounded-lg border border-line">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </section>
        <div className="space-y-8">
          <Skeleton className="h-6 w-48 rounded" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-20" />
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
