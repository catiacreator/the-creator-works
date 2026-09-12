-- ============================================================
-- The Creator Works — a porta do CarouselSnap
-- ============================================================
--
-- A partir daqui, quem entra nesta app entra pelo CarouselSnap. Ele confere
-- a subscrição do lado dele e manda a pessoa para cá com um bilhete assinado;
-- aqui confere-se a letra do bilhete e dá-se o lugar.
--
-- Nada disto inventa máquina nova: o lugar dá-se com o mesmo `resgatar_codigo`
-- que a Hotmart e o Stripe já usavam, e o prazo empurra-se com o mesmo
-- `renovar_acesso`. O que é preciso acrescentar é só duas coisas — um código
-- de sistema para esta porta, e a memória dos bilhetes já gastos.

-- ── o código desta porta ─────────────────────────────────────
-- Não é para dar a ninguém: vive no ambiente do servidor e serve de chave às
-- funções que dão o acesso. Cada passagem gasta um uso, o que dá também a
-- conta de quantas pessoas entraram por aqui.
insert into public.codigos (codigo, papel, nota, usos_max, criado_por)
values ('CAROUSELSNAP-AUTO', 'aluno', 'Entradas pelo CarouselSnap', 10000000, 'sistema')
on conflict (codigo) do update set ativo = true, usos_max = 10000000;

-- ── os bilhetes já gastos ────────────────────────────────────
--
-- Um bilhete de passagem serve uma vez. Sem esta tabela, um endereço apanhado
-- no histórico do browser — ou nos registos de um proxy pelo caminho — voltava
-- a abrir a porta a quem o encontrasse.
--
-- Guarda-se o número do bilhete e a hora. Não se guarda o bilhete: não é
-- preciso, e o que não se guarda não se perde.
create table if not exists public.passagens (
  id uuid primary key default gen_random_uuid(),
  -- o `j` do bilhete
  bilhete text not null unique,
  email text not null,
  usada_em timestamptz not null default now()
);

create index if not exists passagens_usada_em_idx on public.passagens (usada_em);

alter table public.passagens enable row level security;

-- Ninguém lê nem escreve isto a partir do browser. Só a função abaixo lhe
-- toca, e ela corre como dona da tabela.
revoke all on table public.passagens from anon, authenticated;

/**
 * Gastar um bilhete.
 *
 * Devolve true à primeira vez que vê este número e false em todas as
 * seguintes. A conta e a decisão são a mesma instrução — `on conflict do
 * nothing` mais `found` — porque entre um `select` e um `insert` separados
 * cabem dois pedidos ao mesmo tempo com o mesmo bilhete, e passavam os dois.
 *
 * Pede o código de sistema, como as outras funções desta família: quem não o
 * tiver — e ele só existe no servidor — não gasta bilhete nenhum.
 */
create or replace function public.gastar_passagem(c text, bilhete text, e text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  existe boolean;
begin
  select exists (
    select 1 from public.codigos where upper(codigo) = upper(trim(c)) and ativo
  ) into existe;

  if not existe then
    return false;
  end if;

  insert into public.passagens (bilhete, email)
  values (trim(bilhete), lower(trim(e)))
  on conflict (bilhete) do nothing;

  return found;
end;
$$;

revoke all on function public.gastar_passagem(text, text, text) from public;
grant execute on function public.gastar_passagem(text, text, text) to anon, authenticated;

/**
 * Varrer os bilhetes velhos.
 *
 * Um bilhete vale um minuto; passada uma hora não há nada a guardar. Sem isto
 * a tabela crescia para sempre a guardar coisas que já não protegem nada.
 */
create or replace function public.limpar_passagens()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  quantas integer;
begin
  delete from public.passagens where usada_em < now() - interval '1 hour';
  get diagnostics quantas = row_count;
  return quantas;
end;
$$;

revoke all on function public.limpar_passagens() from public;
grant execute on function public.limpar_passagens() to anon, authenticated;

-- ============================================================
-- Fechar a porta dos códigos de sistema
-- ============================================================
--
-- Há uma segunda porta nesta app, e estava aberta.
--
-- A página /acesso troca um código por um lugar. Os códigos de convite saem
-- da mão dela e são impossíveis de adivinhar — mas os códigos de SISTEMA, os
-- que as vendas automáticas usam, chamam-se 'HOTMART-AUTO', 'STRIPE-AUTO' e
-- 'CAROUSELSNAP-AUTO'. Qualquer pessoa que abrisse /acesso e escrevesse um
-- deles ganhava um lugar na app. Não é preciso descobrir nada: basta
-- adivinhar o nome, e o nome adivinha-se.
--
-- A partir daqui, um código de sistema só vale para quem fala com a base de
-- dados com a chave de serviço — ou seja, o servidor desta app. Do browser
-- deixa de valer, mesmo escrito certo. Os códigos de convite dela continuam
-- a funcionar exatamente como antes.

alter table public.codigos
  add column if not exists sistema boolean not null default false;

update public.codigos
set sistema = true
where upper(codigo) in ('HOTMART-AUTO', 'STRIPE-AUTO', 'CAROUSELSNAP-AUTO');

/** Este código ainda serve? Diz que sim ou que não, e mais nada. */
create or replace function public.codigo_valido(c text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.codigos
    where upper(codigo) = upper(trim(c))
      and ativo
      and usos < usos_max
      and (expira is null or expira >= current_date)
      -- um código de sistema não se escreve numa caixa de texto
      and (not sistema or auth.role() = 'service_role')
  );
$$;

/**
 * Trocar o código por um lugar na app.
 *
 * Devolve o papel que o código dá, ou null se já não servir. Não abre conta
 * nenhuma — isso é com o Supabase; isto só guarda o lugar para esse email.
 *
 * Os códigos de sistema só valem para o servidor: é o `auth.role()` que os
 * separa, e ele não se finge do lado do browser.
 */
create or replace function public.resgatar_codigo(c text, e text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  linha public.codigos%rowtype;
begin
  select * into linha from public.codigos
  where upper(codigo) = upper(trim(c))
    and ativo
    and usos < usos_max
    and (expira is null or expira >= current_date)
  for update;

  if not found then
    return null;
  end if;

  if linha.sistema and auth.role() is distinct from 'service_role' then
    return null;
  end if;

  insert into public.membros (email, papel, convidado_por, convite_pendente)
  values (lower(trim(e)), linha.papel, 'código ' || linha.codigo, false)
  on conflict (email) do update
    set ativo = true,
        papel = case when public.membros.papel = 'admin' then 'admin' else excluded.papel end;

  update public.codigos set usos = usos + 1 where codigo = linha.codigo;
  return linha.papel;
end;
$$;

revoke all on function public.codigo_valido(text) from public;
revoke all on function public.resgatar_codigo(text, text) from public;
grant execute on function public.codigo_valido(text) to anon, authenticated;
grant execute on function public.resgatar_codigo(text, text) to anon, authenticated;
