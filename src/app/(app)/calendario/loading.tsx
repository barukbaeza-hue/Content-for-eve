import { Page } from "@/components/shell/page";
import { Skeleton } from "@/components/ui/skeleton";

// Mismo layout que Calendario: navegación, cuadrícula del mes y el banco flotante
export default function Loading() {
  return (
    <Page title="Calendario">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-5 w-40 rounded" />
          </div>
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="grid min-h-[560px] flex-1 grid-cols-7 grid-rows-[auto_repeat(5,1fr)] overflow-hidden rounded-lg border border-line">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={`h${i}`} className="border-b border-line bg-surface-2 px-2 py-2.5">
              <Skeleton className="mx-auto h-3 w-8 rounded bg-surface-3" />
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className={`p-2 ${i % 7 ? "border-l border-line" : ""} ${i >= 7 ? "border-t border-line" : ""}`}>
              <Skeleton className="ml-auto h-4 w-5 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="glass fixed right-6 bottom-6 z-30 w-64 space-y-2 rounded-xl p-3">
        <Skeleton className="h-4 w-16 rounded bg-surface-3" />
        <Skeleton className="h-3 w-32 rounded bg-surface-3" />
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-7 bg-surface-3" />)}
      </div>
    </Page>
  );
}
