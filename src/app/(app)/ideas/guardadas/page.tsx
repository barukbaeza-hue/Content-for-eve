import { Bookmark } from "lucide-react";
import Link from "next/link";
import { Page } from "@/components/shell/page";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { IdeaList } from "../idea-list";
import { IdeasTabs } from "../tabs";

export default async function GuardadasPage() {
  const supabase = await createClient();
  const { data: ideas } = await supabase
    .from("ideas")
    .select("id, title, hook, format, script, status")
    .order("created_at", { ascending: false });

  return (
    <Page title="Ideas" actions={<IdeasTabs savedCount={ideas?.length ?? 0} />}>
      {ideas && ideas.length > 0 ? (
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <IdeaList ideas={ideas} />
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Aún no has guardado ideas"
          description="En el chat, pulsa “Guardar” en las ideas que te gusten y aparecerán aquí."
          action={<Link href="/ideas" className={buttonClasses("primary")}>Ir al chat</Link>}
        />
      )}
    </Page>
  );
}
