-- ============================================================
-- The Creator Works — o rasto de quem entrou
-- ============================================================

-- Um aluno só pode ler a sua linha em `membros` — e ainda bem, senão dava-se
-- o papel de admin a si próprio. Mas então também não conseguia escrever a
-- hora a que entrou. Esta função, que corre por baixo do RLS, escreve essa
-- hora e mais nada.
create or replace function public.marcar_acesso()
returns void
language sql
security definer
set search_path = public
as $$
  update public.membros
  set ultimo_acesso = now()
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

revoke all on function public.marcar_acesso() from public;
grant execute on function public.marcar_acesso() to authenticated;
