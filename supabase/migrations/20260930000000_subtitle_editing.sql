-- Edición de subtítulos: el worker guarda una copia sin subtítulos para volver a ponerlos sin reeditar todo
alter table public.videos
  add column clean_path text,
  -- Qué tiene que hacer el worker: la edición completa o solo volver a poner los subtítulos
  add column edit_job text not null default 'completa' check (edit_job in ('completa', 'subtitulos'));

-- Diccionario de la marca: palabras bien escritas (pista para Whisper) y correcciones que se aplican solas
alter table public.brand_profiles
  add column vocabulary text[] not null default '{}',
  add column corrections jsonb not null default '{}';
