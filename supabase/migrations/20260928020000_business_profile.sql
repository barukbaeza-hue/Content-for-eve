-- Mi negocio: contexto de negocio del founder para generar ideas
alter table public.brand_profiles
  add column offer text,
  add column ideal_customer text,
  add column customer_questions text,
  add column objections text,
  add column stories text,
  add column call_to_action text;
