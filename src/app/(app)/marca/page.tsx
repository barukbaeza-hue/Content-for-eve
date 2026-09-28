import { Page } from "@/components/shell/page";
import { createClient } from "@/lib/supabase/server";
import { BrandForm } from "./brand-form";

export default async function MiMarcaPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("brand_profiles")
    .select("niche, audience, tone, topics")
    .maybeSingle();

  return (
    <Page title="Mi marca">
      <div className="mx-auto w-full max-w-xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-xl font-medium">Cuéntale a Mova quién eres</h2>
          <p className="mt-1 text-base text-fg-3">
            Con esto, las ideas y los copys que te proponga sonarán a ti. Puedes cambiarlo cuando quieras.
          </p>
        </div>
        <BrandForm profile={profile} />
      </div>
    </Page>
  );
}
