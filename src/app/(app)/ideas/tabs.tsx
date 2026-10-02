"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function IdeasTabs({ savedCount }: { savedCount: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/ideas", label: "Chat" },
    { href: "/ideas/inspiracion", label: "Inspiración" },
    { href: "/ideas/guardadas", label: "Guardadas", count: savedCount },
  ];

  return (
    <nav className="flex items-center gap-0.5 rounded-md border border-line p-0.5">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}
            className={`flex h-6 items-center gap-1.5 rounded-sm px-2 text-sm font-medium transition-colors duration-150 ${
              active ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg"
            }`}>
            {tab.label}
            {tab.count ? <span className="text-xs text-fg-3">{tab.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
