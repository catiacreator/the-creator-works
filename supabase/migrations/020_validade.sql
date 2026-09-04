-- ============================================================
-- The Creator Works — o acesso que se renova sozinho
-- ============================================================

-- Até aqui, a porta só fechava quando a Hotmart avisava. Se o aviso se
-- perdesse, ficava aberta para sempre. Agora as assinaturas trazem prazo:
-- cada cobrança aprovada empurra a data para a frente, e o silêncio fecha a
-- porta sozinho.
--
-- Nulo quer dizer sem prazo — é o caso de quem entrou por código teu, ou de
-- quem comprou uma vez e não uma mensalidade.
alter table public.membros
  add column if not exists acesso_ate date;

/**
 * Renovar o acesso de quem acabou de pagar mais um mês.
 * Pede o código de sistema, como as outras: só quem o tem — e ele vive no
 * servidor — renova o que quer que seja.
 */
create or replace function public.renovar_acesso(c text, e text, dias int)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  existe boolean;
  ate date;
begin
  select exists (
    select 1 from public.codigos where upper(codigo) = upper(trim(c)) and ativo
  ) into existe;

  if not existe then
    return null;
  end if;

  ate := current_date + greatest(1, coalesce(dias, 35));

  update public.membros
  set acesso_ate = ate, ativo = true
  where lower(email) = lower(trim(e));

  return ate;
end;
$$;

revoke all on function public.renovar_acesso(text, text, int) from public;
grant execute on function public.renovar_acesso(text, text, int) to anon, authenticated;
