import { CalendarDays } from "lucide-react";
import { Page } from "@/components/shell/page";
import { EmptyState } from "@/components/ui/empty-state";

export default function CalendarioPage() {
  return (
    <Page title="Calendario">
      <EmptyState
        icon={CalendarDays}
        title="Tu calendario está vacío"
        description="Programa tus publicaciones y aquí verás qué sale cada día."
      />
    </Page>
  );
}
