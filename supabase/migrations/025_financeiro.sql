-- ============================================================
-- The Creator Works — as contas de toda a gente
-- ============================================================
--
-- Duas coisas, e a primeira é uma correção.
--
-- **Guardava-se o custo e perdia-se a conta.** A `marcar_consumo` escreve em
-- `por_acao` o número de unidades que recebe, e desde que os créditos passaram
-- a ter preço esse número é o CUSTO, não as vezes. Um carrossel custa 3, e
-- ficavam lá 3 — sem maneira de saber se foram três conversas ou um carrossel.
-- Para a pessoa dá na mesma (o que ela quer saber é quanto gastou), mas para
-- quem administra a app é a diferença entre "1469 carrosséis" e "4407 do que
-- quer que isto seja".
--
-- Agora guardam-se os dois: `por_acao` continua a ser o custo, e `vezes_acao`
-- passa a ser a conta. Quem já tinha linhas fica com a conta a zero e o custo
-- intacto — não se inventa passado que não se registou.
--
-- A segunda é a leitura para o painel de administração, que precisa de ver o
-- que é de todos e não só o de quem pergunta.

alter table public.consumos
  add column if not exists vezes_acao jsonb not null default '{}'::jsonb;

/**
 * Marcar mais um gasto, e dizer se ainda cabia.
 *
 * A conta e a decisão acontecem na mesma instrução, de propósito: ler o total
 * primeiro e escrever depois abria uma janela para dois pedidos ao mesmo
 * tempo passarem os dois pelo tecto.
 *
 * `quantos` é o custo em créditos; `vezes` é quantas vezes a coisa aconteceu.
 * São números diferentes — um carrossel são 3 créditos e 1 vez — e é por isso
 * que vão em campos diferentes. O `vezes` tem valor por omissão para as
 * chamadas antigas continuarem a funcionar.
 */
create or replace function public.marcar_consumo(
  acao text,
  tecto int default 250,
  quantos int default 1,
  vezes int default 1
)
returns table (coube boolean, total int, tecto_do_mes int)
language plpgsql
security definer
set search_path = public
as $$
declare
  quem uuid := auth.uid();
  este_mes text := to_char(now() at time zone 'utc', 'YYYY-MM');
  agora int;
begin
  if quem is null then
    raise exception 'sem sessão';
  end if;

  insert into public.consumos (user_id, mes)
    values (quem, este_mes)
    on conflict (user_id, mes) do nothing;

  select c.total into agora
    from public.consumos c
    where c.user_id = quem and c.mes = este_mes
    for update;

  if agora + quantos > tecto then
    return query select false, agora, tecto;
    return;
  end if;

  update public.consumos c
     set total = c.total + quantos,
         por_acao = jsonb_set(
           c.por_acao,
           array[acao],
           to_jsonb(coalesce((c.por_acao ->> acao)::int, 0) + quantos),
           true
         ),
         vezes_acao = jsonb_set(
           coalesce(c.vezes_acao, '{}'::jsonb),
           array[acao],
           to_jsonb(coalesce((c.vezes_acao ->> acao)::int, 0) + greatest(1, vezes)),
           true
         ),
         mexido_em = now()
   where c.user_id = quem and c.mes = este_mes
   returning c.total into agora;

  return query select true, agora, tecto;
end;
$$;

/** O que já se gastou este mês, sem marcar nada. Para o ecrã, não para travar. */
create or replace function public.consumo_do_mes()
returns table (total int, por_acao jsonb, vezes_acao jsonb)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(c.total, 0),
    coalesce(c.por_acao, '{}'::jsonb),
    coalesce(c.vezes_acao, '{}'::jsonb)
    from (select 1) um
    left join public.consumos c
      on c.user_id = auth.uid()
     and c.mes = to_char(now() at time zone 'utc', 'YYYY-MM');
$$;

/**
 * As contas de toda a gente, para o painel de administração.
 *
 * Só a admin passa aqui. A tabela `consumos` tem uma política que dá a cada
 * um o seu, e é assim que deve ser — mas quem gere a app precisa de ver o
 * conjunto, e por isso esta função corre como dona e confere o papel à mão.
 * Sem a conferência, `security definer` seria uma porta aberta às linhas de
 * todos a partir do browser de qualquer pessoa.
 *
 * Devolve uma linha por mês, com o total, o custo por ação e as vezes por
 * ação já somados. Quem faz as contas de escala e de percentagens é o ecrã.
 */
create or replace function public.consumo_de_todos(meses int default 6)
returns table (mes text, pessoas int, total int, por_acao jsonb, vezes_acao jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sou_admin() then
    raise exception 'só a admin vê as contas de todos';
  end if;

  return query
  with achatado as (
    -- uma linha por mês e por ação, com o custo e as vezes já somados
    select
      c.mes as m,
      j.key as chave,
      sum((j.value #>> '{}')::int) as custo,
      sum(coalesce((c.vezes_acao ->> j.key)::int, 0)) as quantas
    from public.consumos c,
         lateral jsonb_each(c.por_acao) j
    group by c.mes, j.key
  ),
  totais as (
    select
      c.mes as m,
      count(distinct c.user_id)::int as pessoas,
      sum(c.total)::int as total
    from public.consumos c
    group by c.mes
  )
  select
    t.m,
    t.pessoas,
    t.total,
    coalesce(
      (select jsonb_object_agg(a.chave, a.custo) from achatado a where a.m = t.m),
      '{}'::jsonb
    ),
    coalesce(
      (select jsonb_object_agg(a.chave, a.quantas) from achatado a where a.m = t.m),
      '{}'::jsonb
    )
  from totais t
  order by t.m desc
  limit greatest(1, meses);
end;
$$;

revoke all on function public.consumo_de_todos(int) from public;
grant execute on function public.consumo_de_todos(int) to authenticated;
