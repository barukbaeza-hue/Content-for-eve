import { ChevronRight, Trash2 } from "lucide-react";
import { FORMATS, STATUSES, type Format, type Status } from "@/lib/content";
import { remove } from "./actions";
import { StatusSelect } from "./status-select";

export type Idea = {
  id: string;
  title: string;
  hook: string | null;
  format: string | null;
  script: string | null;
  status: string;
};

export function IdeaList({ ideas }: { ideas: Idea[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
      {ideas.map((idea) => (
        <li key={idea.id}>
          <details>
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 shrink-0 text-fg-4 transition-transform duration-150 [details[open]_&]:rotate-90" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {idea.format && (
                    <span className="shrink-0 rounded-sm border border-line px-1.5 text-2xs font-medium text-fg-3">
                      {FORMATS[idea.format as Format]}
                    </span>
                  )}
                  <span className="truncate text-base font-medium">{idea.title}</span>
                </div>
                {idea.hook && <p className="mt-0.5 truncate text-sm text-fg-3">{idea.hook}</p>}
              </div>
              <span className="hidden shrink-0 text-sm text-fg-3 sm:block">
                {STATUSES[idea.status as Status]}
              </span>
            </summary>
            <div className="space-y-4 border-t border-line bg-surface-2/50 px-4 py-4 pl-11">
              {idea.hook && (
                <div>
                  <p className="text-xs font-medium text-fg-3">Gancho</p>
                  <p className="mt-1 text-base">{idea.hook}</p>
                </div>
              )}
              {idea.script && (
                <div>
                  <p className="text-xs font-medium text-fg-3">Guion</p>
                  <p className="mt-1 text-base whitespace-pre-line text-fg-2">{idea.script}</p>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <StatusSelect id={idea.id} status={idea.status as Status} />
                <form action={remove}>
                  <input type="hidden" name="id" value={idea.id} />
                  <button aria-label="Borrar idea" data-tip="Borrar idea"
                    className="flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-surface-3 hover:text-fg">
                    <Trash2 className="size-4" strokeWidth={1.75} />
                  </button>
                </form>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
