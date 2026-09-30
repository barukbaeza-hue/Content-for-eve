// Estilo único de los menús flotantes de cristal (tres puntos, banco del calendario, selectores).
// Todos comparten estas clases; lo único que cambia entre ellos es lo que haya detrás.
export const menuClasses = "glass rounded-xl p-1.5";

export const menuItemClasses =
  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-fg transition-colors duration-150 " +
  "hover:bg-[rgb(128_128_128/0.16)] disabled:opacity-50";

export const menuSeparatorClasses = "mx-1 my-1 h-px bg-[var(--glass-line)]";

export const menuLabelClasses = "px-2.5 pt-1 pb-1.5 text-xs font-medium text-fg-3";
