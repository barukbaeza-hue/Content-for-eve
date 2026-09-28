import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-line bg-surface-2">
        <Icon className="size-5 text-fg-3" strokeWidth={1.75} />
      </div>
      <h2 className="text-md font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-base text-fg-3">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
