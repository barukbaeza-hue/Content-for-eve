-- Cuentas de redes conectadas por OAuth. El token solo lo usa el servidor.
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  platform public.platform not null,
  external_user_id text not null,
  username text,
  profile_picture_url text,
  followers_count integer,
  access_token text not null,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  unique (user_id, platform)
);

alter table public.social_accounts enable row level security;
create policy "own social accounts" on public.social_accounts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
