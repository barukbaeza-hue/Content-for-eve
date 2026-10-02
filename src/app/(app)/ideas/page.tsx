import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { Page } from "@/components/shell/page";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { ResetButton } from "./reset-button";
import { SAMPLE_FEED } from "./inspiracion/sample";
import { IdeasTabs } from "./tabs";
import type { ChatMessage } from "./types";
import { Workspace } from "./workspace";

export default async function IdeasPage() {
  const supabase = await createClient();
  const [{ data: brand }, { data: messages }, { count }] = await Promise.all([
    supabase.from("brand_profiles").select("niche").maybeSingle(),
    supabase.from("chat_messages").select("id, role, content, ideas").order("created_at"),
    supabase.from("ideas").select("id", { count: "exact", head: true }),
  ]);

  if (!brand) {
    return (
      <Page title="Ideas">
        <EmptyState
          icon={Lightbulb}
          title="Primero, tu marca"
          description="Cuéntale a Mova quién eres y te propondrá ideas de contenido para Instagram y TikTok."
          action={<Link href="/marca" className={buttonClasses("primary")}>Completar mi marca</Link>}
        />
      </Page>
    );
  }

  const history = (messages ?? []) as ChatMessage[];

  return (
    <Page
      title="Ideas"
      actions={
        <>
          {history.length > 0 && <ResetButton />}
          <IdeasTabs savedCount={count ?? 0} />
        </>
      }>
      <Workspace items={SAMPLE_FEED} initialMessages={history} />
    </Page>
  );
}
