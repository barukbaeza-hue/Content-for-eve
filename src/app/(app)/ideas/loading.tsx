import { Page } from "@/components/shell/page";
import { Skeleton } from "@/components/ui/skeleton";

// Mismo layout que Ideas: conversación centrada y el cuadro de mensaje abajo
export default function Loading() {
  return (
    <Page title="Ideas">
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6">
          <div className="flex justify-end"><Skeleton className="h-10 w-64 rounded-xl" /></div>
          <div className="flex gap-3">
            <Skeleton className="size-6 shrink-0 rounded-md" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          </div>
        </div>
        <div className="px-4 pt-6 pb-4 sm:px-6">
          <Skeleton className="mx-auto h-[54px] w-full max-w-3xl rounded-xl" />
        </div>
      </div>
    </Page>
  );
}
