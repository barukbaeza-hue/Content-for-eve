"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { CreatorInfo, TikTokSettings } from "@/lib/tiktok";
import { tiktokCreator, updatePost, type Platform } from "./actions";

const NETWORKS: { id: Platform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
];

const PRIVACY: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Todo el mundo",
  MUTUAL_FOLLOW_FRIENDS: "Amigos",
  FOLLOWER_OF_CREATOR: "Seguidores",
  SELF_ONLY: "Solo yo",
};

const EMPTY: TikTokSettings = {
  privacy: "",
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  brandOrganic: false,
  brandContent: false,
};

function Check({ label, checked, disabled, hint, onChange }: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`flex items-start gap-2 text-sm ${disabled ? "text-fg-4" : ""}`}>
      <input type="checkbox" className="mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="block text-xs text-fg-3">{hint}</span>}
      </span>
    </label>
  );
}

// Texto que acompaña al vídeo al publicarse, redes donde sale y, para TikTok, los ajustes que TikTok exige elegir.
export function PostDialog({ id, caption, platforms, tiktok, duration, onClose }: {
  id: string;
  caption: string;
  platforms: Platform[];
  tiktok: TikTokSettings | null;
  duration: number | null;
  onClose: () => void;
}) {
  const [text, setText] = useState(caption);
  const [chosen, setChosen] = useState<Platform[]>(platforms);
  const [settings, setSettings] = useState<TikTokSettings>(tiktok ?? EMPTY);
  // Contenido comercial activado si ya se había marcado alguna opción
  const [commercial, setCommercial] = useState(Boolean(tiktok?.brandOrganic || tiktok?.brandContent));
  const [creator, setCreator] = useState<{ info?: CreatorInfo; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const withTikTok = chosen.includes("tiktok");

  // Al elegir TikTok se pide la cuenta y las opciones que permite
  useEffect(() => {
    if (!withTikTok || creator) return;
    let cancelled = false;
    tiktokCreator()
      .catch(() => ({ error: "No se pudo leer tu cuenta de TikTok." }))
      .then((result) => !cancelled && setCreator(result));
    return () => {
      cancelled = true;
    };
  }, [withTikTok, creator]);

  const info = creator?.info;
  const set = (patch: Partial<TikTokSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const tooLong = info?.maxDuration && duration ? duration > info.maxDuration : false;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (withTikTok) {
      if (!settings.privacy) return setError("Elige quién puede ver el vídeo en TikTok.");
      if (commercial && !settings.brandOrganic && !settings.brandContent) {
        return setError("Indica si el contenido comercial es de tu marca o patrocinado, o desactívalo.");
      }
    }
    setSaving(true);
    const tiktokSettings = withTikTok ? { ...settings, ...(commercial ? {} : { brandOrganic: false, brandContent: false }) } : null;
    const result = await updatePost(id, text, chosen, tiktokSettings);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(0_0_0/0.25)] p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="post-title" onSubmit={save}
        className="glass no-scrollbar max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 id="post-title" className="text-md font-medium">Descripción y redes</h2>
        <p className="mt-1 text-sm text-fg-3">Es el texto que sale con el vídeo al publicarse.</p>
        <Textarea className="mt-3 resize-none" rows={6} value={text} maxLength={2200} autoFocus disabled={saving}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe el texto de la publicación, con sus hashtags…" />
        <p className="mt-1 text-right text-xs text-fg-4 tabular-nums">{text.length} / 2.200</p>
        <div className="mt-2 flex gap-4">
          {NETWORKS.map((n) => (
            <label key={n.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={chosen.includes(n.id)} disabled={saving}
                onChange={(e) => setChosen((prev) => (e.target.checked ? [...prev, n.id] : prev.filter((p) => p !== n.id)))} />
              {n.label}
            </label>
          ))}
        </div>

        {/* Ajustes de TikTok: los pide TikTok antes de publicar y ninguno viene marcado por defecto */}
        {withTikTok && (
          <section className="mt-5 space-y-4 border-t border-[var(--glass-line)] pt-4">
            <div className="flex items-center gap-2">
              {info?.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={info.avatarUrl} alt="" className="size-6 rounded-full" />
              )}
              <p className="text-sm font-medium">
                TikTok{info ? ` · se publicará en @${info.username ?? info.nickname}` : ""}
              </p>
            </div>

            {!creator && <p className="text-sm text-fg-3">Cargando tu cuenta de TikTok…</p>}
            {creator?.error && <p className="text-sm text-danger">{creator.error}</p>}

            {info && (
              <>
                {tooLong && (
                  <p className="text-sm text-danger">
                    El vídeo dura más de lo que TikTok permite en tu cuenta ({Math.floor(info.maxDuration! / 60)} min).
                  </p>
                )}

                <label className="block space-y-1.5">
                  <span className="text-sm text-fg-2">Quién puede ver este vídeo</span>
                  <select value={settings.privacy} onChange={(e) => set({ privacy: e.target.value })} disabled={saving}
                    className="h-9 w-full rounded-md border border-line bg-surface-1 px-2 text-sm focus:border-line-strong focus:outline-none">
                    <option value="" disabled>Elige una opción</option>
                    {info.privacyOptions.map((o) => (
                      <option key={o} value={o} disabled={o === "SELF_ONLY" && commercial && settings.brandContent}>
                        {PRIVACY[o] ?? o}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <p className="text-sm text-fg-2">Permitir a los demás</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <Check label="Comentar" checked={settings.allowComment} disabled={info.commentDisabled || saving}
                      onChange={(v) => set({ allowComment: v })} />
                    <Check label="Dúo" checked={settings.allowDuet} disabled={info.duetDisabled || saving}
                      onChange={(v) => set({ allowDuet: v })} />
                    <Check label="Stitch" checked={settings.allowStitch} disabled={info.stitchDisabled || saving}
                      onChange={(v) => set({ allowStitch: v })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Check label="Contenido comercial" checked={commercial} disabled={saving}
                    hint="Actívalo si el vídeo promociona tu marca, un producto o un servicio."
                    onChange={setCommercial} />
                  {commercial && (
                    <div className="ml-6 space-y-2">
                      <Check label="Tu marca" checked={settings.brandOrganic} disabled={saving}
                        hint="Se etiquetará como «Contenido promocional»."
                        onChange={(v) => set({ brandOrganic: v })} />
                      <Check label="Contenido de marca (patrocinado)" checked={settings.brandContent}
                        disabled={saving || settings.privacy === "SELF_ONLY"}
                        hint={settings.privacy === "SELF_ONLY"
                          ? "No disponible si solo tú puedes ver el vídeo."
                          : "Se etiquetará como «Colaboración pagada»."}
                        onChange={(v) => set({ brandContent: v })} />
                    </div>
                  )}
                </div>

                <p className="text-xs text-fg-3">
                  Al publicar, aceptas la{" "}
                  <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-fg">Confirmación de uso de música</a>
                  {commercial && settings.brandContent && (
                    <>
                      {" "}y la{" "}
                      <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-fg">Política de contenido de marca</a>
                    </>
                  )}{" "}
                  de TikTok. Tras publicarse, el vídeo puede tardar unos minutos en aparecer en tu perfil.
                </p>
              </>
            )}
          </section>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving || !chosen.length || (withTikTok && (!info || tooLong))}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
