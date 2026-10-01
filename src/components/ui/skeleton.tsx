// Bloque gris que late mientras llegan los datos. Cada sección tiene su loading.tsx con su mismo layout.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

// Tarjeta de métrica (mismo tamaño que Stat)
export function StatSkeleton({ detail = false }: { detail?: boolean }) {
  return (
    <div className="space-y-2 rounded-lg border border-line p-4">
      <Skeleton className="h-3 w-20 rounded" />
      <Skeleton className="h-6 w-16 rounded" />
      {detail && <Skeleton className="h-3 w-32 rounded" />}
    </div>
  );
}

// Rejilla de vídeos verticales (Vídeos y Métricas)
export function VideoGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}><Skeleton className="aspect-[9/16]" /></li>
      ))}
    </ul>
  );
}
