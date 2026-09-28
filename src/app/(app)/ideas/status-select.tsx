"use client";

import { useTransition } from "react";
import { STATUSES, type Status } from "@/lib/content";
import { setStatus } from "./actions";

export function StatusSelect({ id, status }: { id: string; status: Status }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Estado"
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => setStatus(id, e.target.value as Status))}
      className="h-7 rounded-md border border-line bg-surface-1 px-2 text-sm text-fg-2 transition-colors duration-150 hover:border-line-strong focus:border-accent focus:outline-none disabled:opacity-50">
      {Object.entries(STATUSES).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
}
