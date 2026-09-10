-- ============================================================
-- The Creator Works — o tecto de cada mês
-- ============================================================

-- Cada pedido à Cát.IA custa dinheiro. Quase toda a gente faz uns quantos por
-- semana e nem se nota; mas basta uma pessoa a carregar no botão sem parar,
-- ou um script mal-intencionado com a sessão dela, para a mensalidade de um
-- mês ir toda em API num fim de semana.
--
-- Por isso há um tecto: 200 pedidos por pessoa por mês. É um número que
-- ninguém a trabalhar normalmente alcança, e que trava quem alcançar.
--
-- Guarda-se uma linha por pessoa e por mês, com o total e a repartição por
-- tipo de pedido. A repartição não serve para travar nada — serve para se
-- perceber, daqui a uns meses, onde é que o dinheiro está mesmo a ir.

create table if not exists public.consumos (
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- o mês em 'AAAA-MM'; texto porque é o que se lê e o que se agrupa
  mes        text not null,
  total      int  not null default 0,
  por_acao   jsonb not null default '{}'::jsonb,
  criado_em  timestamptz not null default now(),
  mexido_em  timestamptz not null default now(),
  primary key (user_id, mes)
);

alter table public.consumos enable row level security;

-- cada um vê o seu, como em todas as outras tabelas da app. Escrever é só
-- pela função aqui em baixo, que corre com os privilégios de quem a criou —
-- assim ninguém consegue pôr o seu contador a zero pela API.
drop policy if exists "own_consumos" on public.consumos;
create policy "own_consumos" on public.consumos
  for select using (user_id = auth.uid());

/**
 * Marcar mais um pedido, e dizer se ainda cabia.
 *
 * A conta e a decisão acontecem na mesma instrução, de propósito: ler o total
 * primeiro e escrever depois abria uma janela para dois pedidos ao mesmo
 * tempo passarem os dois pelo tecto.
 *
 * Devolve o total já com este dentro e quanto falta para o tecto. Se o tecto
 * já tinha sido alcançado, não marca nada e devolve `coube = false`.
 */
create or replace function public.marcar_consumo(
  acao text,
  tecto int default 200,
  -- um lote escreve vários carrosséis de uma vez: conta-os todos, ou o tecto
  -- seria contornado pedindo dez ao mesmo tempo em vez de dez à vez
  quantos int default 1
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

  -- a linha do mês, criada à primeira vez
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
         mexido_em = now()
   where c.user_id = quem and c.mes = este_mes
   returning c.total into agora;

  return query select true, agora, tecto;
end;
$$;

/** O que já se gastou este mês, sem marcar nada. Para o ecrã, não para travar. */
create or replace function public.consumo_do_mes()
returns table (total int, por_acao jsonb)
language sql
security definer
set search_path = public
as $$
  select coalesce(c.total, 0), coalesce(c.por_acao, '{}'::jsonb)
    from (select 1) um
    left join public.consumos c
      on c.user_id = auth.uid()
     and c.mes = to_char(now() at time zone 'utc', 'YYYY-MM');
$$;
