import type { ComponentProps } from "react";

export const fieldClasses =
  "w-full rounded-md border border-line bg-surface-1 px-3 text-base text-fg placeholder:text-fg-4 " +
  "transition-colors duration-150 hover:border-line-strong focus:border-accent focus:outline-none";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${fieldClasses} h-9 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${fieldClasses} py-2 ${className}`} {...props} />;
}

export function Label({ className = "", ...props }: ComponentProps<"label">) {
  return <label className={`block text-sm font-medium text-fg-2 ${className}`} {...props} />;
}
