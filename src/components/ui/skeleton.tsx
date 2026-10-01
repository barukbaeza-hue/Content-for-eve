import { Page } from "@/components/shell/page";

// Bloque gris que late mientras llegan los datos
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

// Pantalla de carga de una sección: aparece al instante al hacer clic, antes de que lleguen los datos
export function PageSkeleton({ title, variant = "grid" }: { title: string; variant?: "grid" | "calendar" | "form" }) {
  return (
    <Page title={title}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-8">
        {variant === "grid" && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-[9/16]" />)}
            </div>
          </>
        )}
        {variant === "calendar" && (
          <>
            <div className="flex justify-between"><Skeleton className="h-8 w-56" /><Skeleton className="h-8 w-36" /></div>
            <Skeleton className="h-[70vh]" />
          </>
        )}
        {variant === "form" && (
          <div className="mx-auto max-w-xl space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        )}
      </div>
    </Page>
  );
}
