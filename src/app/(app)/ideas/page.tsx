import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { Page } from "@/components/shell/page";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { Generator } from "./generator";
import { IdeaList } from "./idea-list";

export default async function IdeasPage() {
  const supabase = await createClient();
  const [{ data: brand }, { data: ideas }] = await Promise.all([
    supabase.from("brand_profiles").select("niche").maybeSingle(),
    supabase
      .from("ideas")
      .select("id, title, hook, format, script, status")
      .order("created_at", { ascending: false }),
  ]);

  if (!brand) {
    return (
      <Page title="Ideas">
        <EmptyState
          icon={Lightbulb}
          title="Aún no tienes ideas"
          description="Completa tu marca y Mova te propondrá ideas de contenido para Instagram y TikTok."
          action={<Link href="/marca" className={buttonClasses("primary")}>Completar mi marca</Link>}
        />
      </Page>
    );
  }

  return (
    <Page title="Ideas">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8">
        <Generator />

        {ideas && ideas.length > 0 ? (
          <IdeaList ideas={ideas} />
        ) : (
          <p className="text-center text-base text-fg-3">
            Aún no tienes ideas. Pulsa “Generar 5 ideas” para empezar.
          </p>
        )}
      </div>
    </Page>
  );
}
