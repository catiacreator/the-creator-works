-- ============================================================
-- The Creator Works — uma permissão por página do menu
-- ============================================================

-- Antes, "criar conteúdo" era um bloco só: quem o tinha, tinha o Criar, os
-- Carrosséis Creator, o Editor, a Biblioteca e a Cát.IA de uma vez. Agora
-- cada página do menu tem a sua linha na tabela dos papéis, para ela poder
-- decidir uma a uma.
--
-- Quem já tinha o bloco fica com as páginas todas que ele abria — ninguém
-- perde acesso por causa desta mudança.
update public.papeis
set permissoes = (
  select array_agg(distinct p order by p)
  from unnest(
    permissoes ||
    case when 'criar' = any(permissoes)
      then array['carrosseis', 'editor', 'biblioteca', 'chat']
      else array[]::text[]
    end
  ) as p
),
atualizado = now();
