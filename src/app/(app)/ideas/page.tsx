import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { Page } from "@/components/shell/page";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function IdeasPage() {
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
