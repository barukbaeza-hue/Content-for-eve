"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { saveBrandProfile } from "./actions";

export type BrandProfile = {
  offer: string | null;
  voice: string | null;
  insights: string | null;
  niche: string | null;
  audience: string | null;
  tone: string | null;
  topics: string[];
  building: string | null;
  story: string | null;
  expertise: string | null;
  opinions: string | null;
  audience_questions: string | null;
  call_to_action: string | null;
};

type StoryField = keyof Pick<BrandProfile,
  "offer" | "building" | "story" | "expertise" | "opinions" | "audience_questions" | "call_to_action">;

const STORY_FIELDS: { name: StoryField; label: string; placeholder: string; rows: number }[] = [
  { name: "offer", label: "Tu oferta", rows: 2,
    placeholder: "Ej.: asesorías de imagen y un curso online de armario cápsula" },
  { name: "building", label: "¿Qué estás construyendo?", rows: 2,
    placeholder: "Ej.: una marca de ropa sostenible que quiero llevar a tienda física este año" },
  { name: "story", label: "Tu historia", rows: 4,
    placeholder: "Cómo empezaste, momentos clave, errores que te enseñaron algo…" },
  { name: "expertise", label: "¿Qué sabes que otros quieren aprender?", rows: 3,
    placeholder: "Ej.: producir en pequeñas cantidades, encontrar proveedores, vender por Instagram" },
  { name: "opinions", label: "¿En qué piensas distinto a la mayoría?", rows: 3,
    placeholder: "Ej.: no hace falta invertir en publicidad para vender tus primeras 100 prendas" },
  { name: "audience_questions", label: "¿Qué te pregunta tu audiencia?", rows: 3,
    placeholder: "Una por línea. Ej.: ¿Cómo encontraste tu primer proveedor?" },
  { name: "call_to_action", label: "¿A dónde quieres llevar a tu audiencia?", rows: 2,
    placeholder: "Ej.: a mi newsletter, a escribirme por mensaje privado, a mi web" },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-8">
      <legend className="mb-6 w-full border-b border-line pb-3 text-lg font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}

const TONES = ["Cercano", "Divertido", "Inspirador", "Directo", "Profesional", "Educativo"];

export function BrandForm({ profile }: { profile: BrandProfile | null }) {
  const [state, formAction, pending] = useActionState(saveBrandProfile, null);
  const [tone, setTone] = useState(profile?.tone ?? "");

  const selected = tone.split(",").map((t) => t.trim()).filter(Boolean);
  const toggleTone = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((t) => t !== value)
      : [...selected, value];
    setTone(next.join(", "));
  };

  return (
    <form action={formAction} className="space-y-12">
      <Group title="Tu marca personal">
        <div className="space-y-2">
          <Label htmlFor="niche">¿De qué trata tu contenido?</Label>
          <Input id="niche" name="niche" defaultValue={profile?.niche ?? ""}
            placeholder="Ej.: moda sostenible y consejos de estilo" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audience">¿Para quién creas?</Label>
          <Textarea id="audience" name="audience" rows={3} defaultValue={profile?.audience ?? ""}
            placeholder="Ej.: mujeres de 20 a 35 años que quieren vestir bien sin gastar mucho" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tone">¿Cómo hablas?</Label>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map((t) => {
              const active = selected.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleTone(t)} aria-pressed={active}
                  className={`h-7 rounded-md border px-2.5 text-sm font-medium transition-colors duration-150 ${
                    active
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line text-fg-3 hover:border-line-strong hover:text-fg"
                  }`}>
                  {t}
                </button>
              );
            })}
          </div>
          <Input id="tone" name="tone" value={tone} onChange={(e) => setTone(e.target.value)}
            placeholder="Elige arriba o escríbelo a tu manera" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="voice">Cómo hablas</Label>
          <Textarea id="voice" name="voice" rows={3} defaultValue={profile?.voice ?? ""}
            placeholder="Tus expresiones, cómo empiezas y cómo cierras tus vídeos" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="topics">¿De qué temas hablas?</Label>
          <Input id="topics" name="topics" defaultValue={profile?.topics.join(", ") ?? ""}
            placeholder="Ej.: outfits, compras de segunda mano, cuidado de la ropa" />
        </div>
      </Group>

      <Group title="Tu oferta y tu historia">
        {STORY_FIELDS.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Textarea id={field.name} name={field.name} rows={field.rows}
              defaultValue={profile?.[field.name] ?? ""} placeholder={field.placeholder} />
          </div>
        ))}
      </Group>

      <Group title="Qué te funciona">
        <div className="space-y-2">
          <Label htmlFor="insights">Temas, formatos y ganchos con más alcance</Label>
          <Textarea id="insights" name="insights" rows={4} defaultValue={profile?.insights ?? ""}
            placeholder="Mova lo completa al analizar tus vídeos" />
        </div>
      </Group>

      <div className="space-y-4 border-t border-line pt-6">
        {state && (
          <Notice tone={state.ok ? "success" : "danger"}>
            {state.ok ? (
              <span className="flex flex-wrap items-center gap-x-1">
                Guardado.
                <Link href="/ideas" className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
                  Ir a Ideas <ArrowRight className="size-3.5" strokeWidth={1.75} />
                </Link>
              </span>
            ) : state.message}
          </Notice>
        )}
        <Button variant="primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
