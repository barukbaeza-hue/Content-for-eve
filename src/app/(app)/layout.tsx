import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

const NAV = [
  { href: "/ideas", label: "Ideas" },
  { href: "/copys", label: "Copys" },
  { href: "/calendario", label: "Calendario" },
  { href: "/marca", label: "Mi marca" },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex items-center gap-4 border-b border-neutral-200 px-4 py-3 md:w-56 md:flex-col md:items-stretch md:border-b-0 md:border-r md:py-6 dark:border-neutral-800">
        <span className="text-xl font-semibold">Mova</span>
        <nav className="flex flex-1 gap-3 overflow-x-auto text-sm md:flex-col md:gap-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-md px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <button className="text-sm text-neutral-500 hover:text-foreground">Salir</button>
        </form>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
