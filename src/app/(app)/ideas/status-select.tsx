"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/controls";
import { STATUSES, type Status } from "@/lib/content";
import { setStatus } from "./actions";

export function StatusSelect({ id, status }: { id: string; status: Status }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="w-40">
      <Select label="Estado" value={status} disabled={pending}
        onChange={(v) => startTransition(() => setStatus(id, v))}
        options={(Object.entries(STATUSES) as [Status, string][]).map(([value, label]) => ({ value, label }))} />
    </div>
  );
}
