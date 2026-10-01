-- Ajustes de publicación en TikTok elegidos por el usuario (privacidad, interacciones y contenido comercial)
alter table public.videos add column tiktok_settings jsonb;
