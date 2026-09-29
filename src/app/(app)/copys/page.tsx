import { redirect } from "next/navigation";

// Los copys ahora viven en cada vídeo del banco.
export default function CopysPage() {
  redirect("/videos");
}
