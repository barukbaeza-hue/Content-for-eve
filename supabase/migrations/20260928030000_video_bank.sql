-- Banco de vídeos: sustituye a la tabla posts (vacía), un vídeo puede ir a varias redes
drop table public.posts;

create type public.video_status as enum ('ready', 'scheduled', 'published', 'failed');

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  idea_id uuid references public.ideas(id) on delete set null,
  title text not null default 'Vídeo sin título',
  storage_path text not null,
  caption text,
  hashtags text[] not null default '{}',
  platforms public.platform[] not null default '{instagram,tiktok}',
  status public.video_status not null default 'ready',
  -- Orden en la cola del banco: menor sale antes
  position double precision not null default extract(epoch from now()),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.videos (user_id, status, position);
create index on public.videos (user_id, scheduled_at);
create index on public.videos (idea_id);

alter table public.videos enable row level security;
create policy "own videos" on public.videos for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Ritmo de publicación
alter table public.brand_profiles
  add column posts_per_day smallint not null default 1 check (posts_per_day between 1 and 3),
  add column post_times text[] not null default '{12:00,19:00,21:00}',
  add column timezone text not null default 'UTC';
