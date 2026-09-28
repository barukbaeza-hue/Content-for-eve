-- El foco es la marca personal del founder (distribución y confianza), no vender un negocio.
alter table public.brand_profiles
  drop column offer,
  drop column ideal_customer,
  drop column objections;
alter table public.brand_profiles rename column customer_questions to audience_questions;
alter table public.brand_profiles rename column stories to story;
alter table public.brand_profiles
  add column building text,
  add column expertise text,
  add column opinions text;
