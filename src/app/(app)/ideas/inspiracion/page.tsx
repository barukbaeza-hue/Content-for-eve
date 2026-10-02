import { Page } from "@/components/shell/page";
import { createClient } from "@/lib/supabase/server";
import { IdeasTabs } from "../tabs";
import { Feed } from "./feed";
import { SAMPLE_FEED } from "./sample";

export default async function InspiracionPage() {
  const supabase = await createClient();
  const { count } = await supabase.from("ideas").select("id", { count: "exact", head: true });

  return (
    <Page title="Ideas" actions={<IdeasTabs savedCount={count ?? 0} />}>
      <Feed items={SAMPLE_FEED} />
    </Page>
  );
}
