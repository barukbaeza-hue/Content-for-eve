-- Perfil de marca: contexto que usa la IA
create table public.brand_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  niche text,
  audience text,
  tone text,
  topics text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create type public.idea_status as enum ('idea', 'in_production', 'ready', 'scheduled', 'published');
create type public.content_format as enum ('reel', 'carousel', 'post', 'tiktok', 'story');
create type public.platform as enum ('instagram', 'tiktok');

-- Banco de ideas
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  hook text,
  format public.content_format,
  script text,
  status public.idea_status not null default 'idea',
  created_at timestamptz not null default now()
);

-- Referencias de la competencia
create table public.references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text,
  notes text,
  created_at timestamptz not null default now()
);

-- Publicaciones programadas
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  idea_id uuid references public.ideas(id) on delete set null,
  platform public.platform not null,
  caption text,
  hashtags text[] not null default '{}',
  media_path text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.ideas (user_id);
create index on public.references (user_id);
create index on public.posts (user_id, scheduled_at);
create index on public.posts (idea_id);

alter table public.brand_profiles enable row level security;
alter table public.ideas enable row level security;
alter table public.references enable row level security;
alter table public.posts enable row level security;

create policy "own brand profile" on public.brand_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own ideas" on public.ideas for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own references" on public.references for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own posts" on public.posts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Almacenamiento privado de videos e imágenes, una carpeta por usuario
insert into storage.buckets (id, name, public) values ('media', 'media', false);
create policy "own media" on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
