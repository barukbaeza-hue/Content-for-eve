-- Publicación en Instagram y TikTok. El worker publica cada vídeo programado cuando llega su hora.

-- TikTok da un token de 24 h y otro para renovarlo (365 días)
alter table public.social_accounts
  add column refresh_token text,
  add column refresh_expires_at timestamptz;

create type public.publish_status as enum ('pending', 'processing', 'published', 'failed');

-- Una fila por vídeo y red: su estado, el id que da la red y el enlace final
create table public.publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  platform public.platform not null,
  status public.publish_status not null default 'pending',
  -- Contenedor de Instagram o publish_id de TikTok mientras se procesa
  job_id text,
  post_id text,
  permalink text,
  error text,
  attempts smallint not null default 0,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (video_id, platform)
);

create index on public.publications (status);

alter table public.publications enable row level security;
create policy "own publications" on public.publications for select to authenticated
  using ((select auth.uid()) = user_id);
-- Al reprogramar un vídeo que falló, la app borra sus intentos anteriores
create policy "own publications delete" on public.publications for delete to authenticated
  using ((select auth.uid()) = user_id);
