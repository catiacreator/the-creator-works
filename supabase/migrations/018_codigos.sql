-- ============================================================
-- The Creator Works — códigos de acesso
-- ============================================================

-- Não há registo aberto: entra quem tem um código, e o código sai da mão
-- dela no momento da compra. Cada código pode servir uma pessoa ou várias,
-- pode ter validade, e pode ser desligado a meio.
create table if not exists public.codigos (
  codigo      text primary key,
  papel       text not null default 'aluno' check (papel in ('admin', 'suporte', 'aluno')),
  nota        text,                       -- para quem é, ou de que venda veio
  usos_max    int  not null default 1,
  usos        int  not null default 0,
  expira      date,
  ativo       boolean not null default true,
  criado_por  text,
  created_at  timestamptz not null default now()
);

alter table public.codigos enable row level security;

-- Ninguém lê esta tabela sem ser a admin. Quem tem um código usa-o pelas
-- funções abaixo, que correm por baixo do RLS e não devolvem a lista.
drop policy if exists "admin_gere_codigos" on public.codigos;
create policy "admin_gere_codigos" on public.codigos
  for all using (public.sou_admin()) with check (public.sou_admin());

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
  );
$$;

/**
 * Trocar o código por um lugar na app.
 * Devolve o papel que o código dá, ou null se já não servir. Não abre conta
 * nenhuma — isso é com o Supabase; isto só guarda o lugar para esse email.
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
