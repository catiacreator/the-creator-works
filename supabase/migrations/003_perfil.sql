-- ============================================================
-- CCreator Lab — documento mestre (quem sou, nicho, objetivos)
-- ============================================================

-- O texto vai em todos os pedidos à IA: no chat e na escrita dos carrosséis.
alter table public.settings
  add column if not exists perfil text;

-- Nome do ficheiro de onde veio, só para se ver na página.
alter table public.settings
  add column if not exists perfil_origem text;

alter table public.settings
  add column if not exists perfil_atualizado_em timestamptz;
