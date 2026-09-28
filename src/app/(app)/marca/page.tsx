import { Sparkles } from "lucide-react";
import { Page } from "@/components/shell/page";
import { EmptyState } from "@/components/ui/empty-state";

export default function MiMarcaPage() {
  return (
    <Page title="Mi marca">
      <EmptyState
        icon={Sparkles}
        title="Cuéntale a Mova quién eres"
        description="Tu nicho, tu público y tu tono. Con esto, las ideas y los copys suenan a ti."
      />
    </Page>
  );
}
