export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex size-6 items-center justify-center rounded-md bg-accent text-xs font-medium text-on-accent ${className}`}>
      M
    </span>
  );
}
