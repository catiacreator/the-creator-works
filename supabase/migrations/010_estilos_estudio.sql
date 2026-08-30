-- Os estilos do estúdio seguem a conta, não o computador.
alter table public.settings
  add column if not exists studio_styles jsonb not null default '[]'::jsonb;
