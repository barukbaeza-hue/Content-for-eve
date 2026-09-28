-- Marca cuándo terminó el onboarding. Los perfiles que ya existían se dan por completados.
alter table public.brand_profiles add column onboarded_at timestamptz;
update public.brand_profiles set onboarded_at = now() where onboarded_at is null;
