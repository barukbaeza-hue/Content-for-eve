import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Logo } from "@/components/shell/logo";
import { Nav, TabBar } from "@/components/shell/nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-2 md:w-60 md:flex-col md:items-stretch md:gap-4 md:border-b-0 md:px-3 md:py-3">
        <div className="flex h-7 items-center gap-2 px-1">
          <Logo />
          <span className="text-sm font-medium">Mova</span>
        </div>

        <div className="hidden flex-1 md:block">
          <Nav />
        </div>

        <form action={logout} className="flex items-center gap-2 md:border-t md:border-line md:pt-3">
          <span className="hidden min-w-0 flex-1 truncate px-1 text-xs text-fg-3 md:block">
            {data.claims.email}
          </span>
          <button aria-label="Salir" title="Salir"
            className="flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-surface-2 hover:text-fg">
            <LogOut className="size-4" strokeWidth={1.75} />
          </button>
        </form>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 pb-14 md:py-2 md:pr-2 md:pb-2">
        <div className="flex flex-1 overflow-y-auto bg-surface-1 md:rounded-xl md:border md:border-line">
          {children}
        </div>
      </main>

      <TabBar />
    </div>
  );
}
