-- ============================================================
-- Registar-se sem código
-- ============================================================
--
-- Até agora só se entrava nesta app de três maneiras: um código de convite
-- escrito no /acesso, um bilhete assinado vindo do CarouselSnap, ou uma
-- compra que o webhook da Hotmart anunciava. As três têm uma coisa em comum
-- — depende de outra pessoa ou de outro sistema ter feito alguma coisa
-- primeiro. Quem chegava sem nada disso não tinha por onde começar.
--
-- Agora há a quarta: escrever o nome, o email e uma palavra-passe.
--
-- ── Porque é que a função não recebe o email ─────────────────
--
-- Seria o óbvio — `registar(email, nome)` — e seria uma porta escancarada.
-- Esta função tem de estar ao alcance de quem se acabou de registar, e uma
-- função que recebe um email e lhe dá lugar é uma função que dá lugar ao
-- email de qualquer pessoa. Bastava alguém chamá-la com o email de outra
-- para lho ativar, ou reactivar o de alguém que foi posto fora.
--
-- Por isso o email vem do `auth.jwt()`. Quem a chama só se pode dar lugar a
-- si próprio, e só depois de ter mesmo uma conta no Supabase — o que, com a
-- confirmação por email ligada, quer dizer depois de provar que o endereço é
-- dele.
--
-- ── E o que ela não faz ──────────────────────────────────────
--
-- Nunca toca numa linha que já exista. Quem já é admin continua admin; quem
-- foi desativado continua desativado e não se reactiva sozinho por voltar a
-- registar-se. Só escreve quando não há lá nada.

create or replace function public.registar_me(nome text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  quem text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if quem = '' then
    return false;
  end if;

  -- já tem linha? não se lhe toca. Isto é o que impede alguém desativado de
  -- voltar a entrar só por se registar outra vez.
  if exists (select 1 from public.membros where lower(email) = quem) then
    return false;
  end if;

  insert into public.membros (email, nome, papel, ativo, convidado_por, convite_pendente)
  values (quem, nullif(trim(nome), ''), 'aluno', true, 'registo', false);

  return true;
end;
$$;

revoke all on function public.registar_me(text) from public, anon;
-- só quem já tem sessão: o email vem do token, e sem token não há email
grant execute on function public.registar_me(text) to authenticated;
