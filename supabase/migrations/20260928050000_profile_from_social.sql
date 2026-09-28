-- Perfil generado a partir de los vídeos del founder (editable)
alter table public.brand_profiles
  add column offer text,
  add column voice text,
  add column insights text,
  add column source text not null default 'manual' check (source in ('manual', 'instagram', 'tiktok', 'instagram_tiktok')),
  add column analyzed_videos integer not null default 0,
  add column analyzed_at timestamptz;
