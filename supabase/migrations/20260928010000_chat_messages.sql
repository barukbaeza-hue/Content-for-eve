-- Conversación con la IA en el Centro de ideas
create type public.chat_role as enum ('user', 'assistant');

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role public.chat_role not null,
  content text not null,
  ideas jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index on public.chat_messages (user_id, created_at);

alter table public.chat_messages enable row level security;

create policy "own chat messages" on public.chat_messages for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
