import { Page } from "@/components/shell/page";
import { PROFILE_FIELDS } from "@/lib/content";
import { instagramConfigured } from "@/lib/instagram";
import { instagramMessage } from "@/lib/instagram-messages";
import { createClient } from "@/lib/supabase/server";
import { BrandForm, type BrandProfile } from "./brand-form";
import { ConnectPanel } from "./connect-panel";

export default async function MiMarcaPage({ searchParams }: PageProps<"/marca">) {
  const { analizar, instagram: igStatus, detalle } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: instagram }] = await Promise.all([
    supabase.from("brand_profiles").select(`${PROFILE_FIELDS}, source, analyzed_videos, analyzed_at`).maybeSingle(),
    supabase.from("social_accounts").select("username").eq("platform", "instagram").maybeSingle(),
  ]);
  const profile = data as (BrandProfile & { source: string; analyzed_videos: number; analyzed_at: string | null }) | null;

  const analyzed = profile?.analyzed_at
    ? { source: profile.source, videos: profile.analyzed_videos, at: profile.analyzed_at }
    : null;

  return (
    <Page title="Mi marca">
      <div className="mx-auto w-full max-w-xl space-y-10 px-6 py-10">
        <div>
          <h2 className="text-xl font-medium">Tu perfil de founder creator</h2>
          <p className="mt-1 text-base text-fg-3">
            Mova lo crea a partir de tus vídeos. Lo usa para que tus ideas, guiones y copys suenen a ti.
          </p>
        </div>
        <ConnectPanel
          analyzed={analyzed}
          instagram={instagram}
          canConnect={instagramConfigured()}
          autoAnalyze={analizar === "1"}
          message={instagramMessage(igStatus, detalle)}
        />
        <BrandForm profile={profile} />
      </div>
    </Page>
  );
}
