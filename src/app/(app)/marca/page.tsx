import { Page } from "@/components/shell/page";
import { createClient } from "@/lib/supabase/server";
import { BrandForm } from "./brand-form";

export default async function MiMarcaPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("brand_profiles")
    .select("niche, audience, tone, topics, building, story, expertise, opinions, audience_questions, call_to_action")
    .maybeSingle();

  return (
    <Page title="Mi marca">
      <div className="mx-auto w-full max-w-xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-xl font-medium">Cuéntale a Mova quién eres</h2>
          <p className="mt-1 text-base text-fg-3">
            Tu marca personal es tu forma de llegar a la gente y ganarte su confianza. Con esto, las ideas y los guiones sonarán a ti.
          </p>
        </div>
        <BrandForm profile={profile} />
      </div>
    </Page>
  );
}
