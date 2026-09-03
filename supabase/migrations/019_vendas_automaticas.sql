-- ============================================================
-- The Creator Works — vendas automáticas
-- ============================================================

-- O código que a app usa sozinha quando a Hotmart avisa que alguém pagou.
-- Não é para dar a ninguém: vive no ambiente do servidor e serve de chave à
-- função que dá o acesso. Cada venda gasta um uso, o que dá também a conta
-- de quantas entraram por aqui.
insert into public.codigos (codigo, papel, nota, usos_max, criado_por)
values ('HOTMART-AUTO', 'aluno', 'Vendas automáticas da Hotmart', 100000, 'sistema')
on conflict (codigo) do update set ativo = true, usos_max = 100000;

/**
 * Tirar o acesso quando a compra é devolvida ou a assinatura cancelada.
 *
 * Pede o mesmo código das vendas automáticas: quem não o tiver — e ele só
 * existe no servidor — não suspende ninguém. Não apaga nada; só fecha a
 * porta, e ela reabre-se se a pessoa voltar a comprar.
 */
create or replace function public.suspender_por_compra(c text, e text)
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

  update public.membros
  set ativo = false
  where lower(email) = lower(trim(e)) and papel <> 'admin';

  return found;
end;
$$;

revoke all on function public.suspender_por_compra(text, text) from public;
grant execute on function public.suspender_por_compra(text, text) to anon, authenticated;
