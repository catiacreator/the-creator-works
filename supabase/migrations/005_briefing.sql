-- ============================================================
-- CCreator Lab — o briefing, campo a campo
-- ============================================================

-- As respostas ficam estruturadas aqui; a coluna `perfil` continua a guardar
-- o texto corrido que segue para a IA, gerado a partir destas respostas.
alter table public.settings
  add column if not exists briefing jsonb;
