-- ============================================================
-- CCreator Lab — rascunhos desenhados no editor
-- ============================================================

-- Guarda o desenho completo (formato + slides + elementos) de um carrossel
-- feito à mão no editor. Os carrosséis da fábrica continuam sem isto.
alter table public.carousels
  add column if not exists design jsonb;
