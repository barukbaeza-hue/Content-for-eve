-- Perfil simplificado: 4 campos básicos + una descripción larga con todo lo demás.
alter table public.brand_profiles
  add column description text,
  drop column offer,
  drop column voice,
  drop column insights,
  drop column building,
  drop column story,
  drop column expertise,
  drop column opinions,
  drop column audience_questions,
  drop column call_to_action;
