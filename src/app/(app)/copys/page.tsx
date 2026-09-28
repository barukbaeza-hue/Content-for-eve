import { PenLine } from "lucide-react";
import { Page } from "@/components/shell/page";
import { EmptyState } from "@/components/ui/empty-state";

export default function CopysPage() {
  return (
    <Page title="Copys">
      <EmptyState
        icon={PenLine}
        title="Aún no hay copys"
        description="Elige una idea y Mova escribirá la descripción y los hashtags para cada red."
      />
    </Page>
  );
}
