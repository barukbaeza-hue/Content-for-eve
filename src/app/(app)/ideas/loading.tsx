import { Page } from "@/components/shell/page";
import { Skeleton } from "@/components/ui/skeleton";

// Mismo layout que Ideas: en el ordenador, la rejilla de Inspiración con el chat abajo; en el móvil, solo el chat
export default function Loading() {
  return (
    <Page title="Ideas">
      <div className="relative flex-1">
        <div className="hidden px-4 pt-4 md:block">
          <Skeleton className="mb-3 h-5 w-24 rounded" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="aspect-[9/16]" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-2 px-4 pb-4">
          <Skeleton className="mx-auto hidden h-[30px] w-[560px] max-w-full rounded-full md:block" />
          <Skeleton className="mx-auto h-[54px] w-full max-w-2xl rounded-xl" />
        </div>
      </div>
    </Page>
  );
}
