"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { saveBrandProfile } from "./actions";

export type BrandProfile = {
  niche: string | null;
  audience: string | null;
  tone: string | null;
  topics: string[];
  description: string | null;
};

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
          <Label htmlFor="topics">¿De qué temas hablas?</Label>
          <Input id="topics" name="topics" defaultValue={profile?.topics.join(", ") ?? ""}
            placeholder="Ej.: outfits, compras de segunda mano, cuidado de la ropa" />
        </div>
      </Group>

      <Group title="Descripción">
        <div className="space-y-2">
          <Label htmlFor="description">Todo lo demás sobre ti</Label>
          <Textarea id="description" name="description" rows={12} defaultValue={profile?.description ?? ""}
            placeholder={"Cómo hablas y tus expresiones, qué ofreces, qué estás construyendo, tu historia, lo que sabes, tus opiniones, lo que te pregunta tu audiencia, a dónde la llevas y qué te funciona."} />
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
