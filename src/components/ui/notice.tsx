import type { ReactNode } from "react";

const TONES = {
  danger: "text-danger",
  success: "text-success",
};

export function Notice({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <p role={tone === "danger" ? "alert" : "status"}
      className={`rounded-md border border-line bg-surface-2 px-3 py-2 text-sm ${TONES[tone]}`}>
      {children}
    </p>
  );
}
