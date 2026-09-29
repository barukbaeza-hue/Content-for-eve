-- Edición automática: cola que procesa el worker (ffmpeg, Whisper, DeepFilterNet, Remotion)
create type public.edit_status as enum ('queued', 'processing', 'edited', 'failed');

alter table public.videos
  -- Hasta que termina la edición no hay vídeo final
  alter column storage_path drop not null,
  -- Vídeo original subido (se borra al terminar la edición)
  add column raw_path text,
  add column edit_status public.edit_status,
  -- Indicaciones del founder para este vídeo ("más dinámico", "sin música"…)
  add column edit_instructions text,
  add column edit_error text,
  add column edit_attempts smallint not null default 0,
  add column edit_started_at timestamptz,
  add column edited_at timestamptz,
  add column duration_seconds real,
  -- Transcripción con marcas de tiempo por palabra
  add column transcript jsonb,
  -- Ficha del vídeo: lo que dice, lo que se ve, cómo se editó
  add column card jsonb not null default '{}';

-- Un vídeo sin editar no entra al banco hasta que termina la edición
alter type public.video_status add value if not exists 'editing' before 'ready';

create index on public.videos (edit_status, created_at) where edit_status = 'queued';

-- Preferencias fijas de edición del founder
alter table public.brand_profiles add column edit_preferences text;

-- El worker toma el siguiente vídeo de la cola sin que dos workers cojan el mismo.
-- Solo lo puede llamar el service role (el worker), nunca un usuario.
create function public.claim_next_edit()
returns setof public.videos
language sql
security definer
set search_path = ''
as $$
  update public.videos v
  set edit_status = 'processing',
      edit_started_at = now(),
      edit_attempts = v.edit_attempts + 1
  where v.id = (
    select id from public.videos
    where edit_status = 'queued'
       -- Si un worker se apagó a mitad, el vídeo vuelve a la cola tras 30 minutos
       or (edit_status = 'processing' and edit_started_at < now() - interval '30 minutes' and edit_attempts < 3)
    order by created_at
    limit 1
    for update skip locked
  )
  returning v.*;
$$;

revoke all on function public.claim_next_edit() from public, anon, authenticated;
grant execute on function public.claim_next_edit() to service_role;
