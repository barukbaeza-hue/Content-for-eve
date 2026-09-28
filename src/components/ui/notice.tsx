import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

// La paleta es monocromática: el tono se comunica con el icono, no con el color.
const TONES = {
  danger: CircleAlert,
  success: CircleCheck,
};

export function Notice({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  const Icon = TONES[tone];

  return (
    <p role={tone === "danger" ? "alert" : "status"}
      className="flex gap-2 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-fg">
      <Icon className="mt-0.5 size-4 shrink-0 text-fg-2" strokeWidth={1.75} />
      <span>{children}</span>
    </p>
  );
}
