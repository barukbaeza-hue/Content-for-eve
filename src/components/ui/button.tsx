import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-line bg-surface-1 text-fg hover:border-line-strong hover:bg-surface-2",
  ghost: "text-fg-3 hover:bg-surface-2 hover:text-fg",
};

const SIZES = {
  sm: "h-7 gap-1.5 px-2.5",
  md: "h-8 gap-2 px-3",
  lg: "h-10 gap-2 px-4",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function buttonClasses(variant: keyof typeof VARIANTS = "secondary", size: keyof typeof SIZES = "md") {
  return [
    "inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium whitespace-nowrap",
    "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
  ].join(" ");
}

export function Button({ variant, size, className = "", ...props }: ButtonProps) {
  return <button className={`${buttonClasses(variant, size)} ${className}`} {...props} />;
}
