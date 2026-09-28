import { Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandForm, type BrandProfile } from "@/app/(app)/marca/brand-form";
import { Logo } from "@/components/shell/logo";
import { Button, buttonClasses } from "@/components/ui/button";
import { PROFILE_FIELDS } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { finishOnboarding } from "./actions";

const STEPS = ["Conecta tus redes", "Mova analiza tus vídeos", "Revisa tu perfil"];

function Steps({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {STEPS.map((label, i) => (
        <li key={label} className={`flex items-center gap-2 ${i === current ? "text-fg" : "text-fg-4"}`}>
          <span className={`flex size-5 items-center justify-center rounded-full border text-2xs font-medium ${
            i < current ? "border-accent bg-accent text-on-accent" : i === current ? "border-fg" : "border-line"
          }`}>
            {i < current ? <Check className="size-3" strokeWidth={2.5} /> : i + 1}
          </span>
          <span className="font-medium">{label}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function BienvenidaPage({ searchParams }: PageProps<"/bienvenida">) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_profiles")
    .select(`${PROFILE_FIELDS}, onboarded_at`)
    .maybeSingle();
  if (data?.onboarded_at) redirect("/ideas");

  const { paso } = await searchParams;
  const reviewing = paso === "perfil";

  return (
    <main className="min-h-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl space-y-10">
        <div className="space-y-6">
          <Logo className="size-9 text-base" />
          <Steps current={reviewing ? 2 : 0} />
        </div>

        {reviewing ? (
          <>
            <div>
              <h1 className="text-2xl font-medium">Revisa tu perfil</h1>
              <p className="mt-1 text-base text-fg-3">
                Es lo que Mova sabe de ti. Cambia lo que quieras; podrás editarlo siempre desde Mi marca.
              </p>
            </div>
            <BrandForm profile={data as BrandProfile | null} />
            <form action={finishOnboarding} className="border-t border-line pt-6">
              <Button variant="primary" size="lg">Empezar a usar Mova</Button>
            </form>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-medium">Conecta tus redes</h1>
              <p className="mt-1 text-base text-fg-3">
                Mova analiza tus vídeos y crea tu perfil de founder creator: de qué hablas, cómo hablas, qué
                ofreces y qué te funciona. Sin formularios.
              </p>
            </div>
            <div className="space-y-2">
              <Button variant="primary" size="lg" disabled className="w-full">Conectar Instagram</Button>
              <Button size="lg" disabled className="w-full">Conectar TikTok</Button>
              <p className="pt-1 text-center text-xs text-fg-3">La conexión con Instagram y TikTok llega pronto.</p>
            </div>
            <div className="border-t border-line pt-6 text-center">
              <Link href="/bienvenida?paso=perfil" className={buttonClasses("ghost")}>
                Por ahora, lo relleno yo
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
