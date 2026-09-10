-- ============================================================
-- The Creator Works — o caminho de volta
-- ============================================================

-- Guardar um carrossel escrevia por cima do que lá estava. Um slide mexido
-- sem querer, um template aplicado a tudo, e a versão boa desaparecia — não
-- havia para onde voltar.
--
-- Agora, de cada vez que se guarda, a versão anterior fica arrumada aqui.
-- Não é uma cópia de segurança da base de dados: é o desenho tal como estava
-- no momento antes de mudar, para se poder pôr de volta com um clique.

create table if not exists public.carrossel_versoes (
  id           uuid primary key default gen_random_uuid(),
  carousel_id  uuid not null references public.carousels(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text,
  design       jsonb not null,
  motivo       text not null default 'guardado',
  created_at   timestamptz not null default now()
);

-- a listagem é sempre "as deste carrossel, da mais recente para trás"
create index if not exists carrossel_versoes_idx
  on public.carrossel_versoes (carousel_id, created_at desc);

alter table public.carrossel_versoes enable row level security;

-- cada um vê e mexe só nas suas, como em todas as outras tabelas da app
drop policy if exists "own_carrossel_versoes" on public.carrossel_versoes;
create policy "own_carrossel_versoes" on public.carrossel_versoes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

/**
 * Deitar fora as versões velhas de um carrossel.
 *
 * Sem isto, quem trabalha um carrossel uma tarde inteira deixa lá centenas de
 * linhas que ninguém vai abrir. Ficam as mais recentes; o resto vai-se.
 */
create or replace function public.aparar_versoes(c uuid, quantas int default 30)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  apagadas int;
begin
  with sobram as (
    select id
    from public.carrossel_versoes
    where carousel_id = c
    order by created_at desc
    offset greatest(1, coalesce(quantas, 30))
  )
  delete from public.carrossel_versoes v
  using sobram
  where v.id = sobram.id;

  get diagnostics apagadas = row_count;
  return apagadas;
end;
$$;
