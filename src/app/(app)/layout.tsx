import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TabBar } from "@/components/shell/nav";
import { Sidebar, SIDEBAR_COOKIE } from "@/components/shell/sidebar";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/toast";
import { Tooltips } from "@/components/ui/tooltips";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { data: profile } = await supabase.from("brand_profiles").select("onboarded_at").maybeSingle();
  if (!profile?.onboarded_at) redirect("/bienvenida");

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <Sidebar email={data.claims.email ?? ""} initialCollapsed={(await cookies()).get(SIDEBAR_COOKIE)?.value === "contraida"} />

      <main className="flex min-h-0 min-w-0 flex-1 pb-14 md:py-2 md:pr-2 md:pb-2">
        <div className="no-scrollbar flex flex-1 overflow-y-auto bg-surface-1 md:rounded-xl md:border md:border-line">
          {children}
        </div>
      </main>

      <TabBar />
      <Tooltips />
      <Toaster />
    </div>
  );
}
