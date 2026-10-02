import { Page } from "@/components/shell/page";
import { Skeleton } from "@/components/ui/skeleton";

// Mismo layout que el feed: vídeo vertical centrado con sus cifras al lado y el chat abajo
export default function Loading() {
  return (
    <Page title="Ideas">
      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-end justify-center gap-4 px-4 pt-4 pb-[152px]">
          <Skeleton className="aspect-[9/16] h-full max-w-full rounded-xl" />
          <div className="hidden flex-col gap-4 pb-2 sm:flex">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="size-11 rounded-full" />)}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-2 px-4 pb-4">
          <Skeleton className="mx-auto h-[30px] w-80 rounded-full" />
          <Skeleton className="mx-auto h-[54px] w-full max-w-2xl rounded-xl" />
        </div>
      </div>
    </Page>
  );
}
