-- ============================================================
-- The Creator Works — a pessoa é um id, não um email
-- ============================================================
--
-- Até aqui, quem entrava pelo CarouselSnap era identificado pelo email. É o
-- que as duas apps tinham em comum, e funciona — até ao dia em que alguém
-- muda de email do lado de lá.
--
-- Nesse dia, o bilhete seguinte traz um email que esta app nunca viu. Faz-se
-- uma conta nova, e a pessoa entra num Creator Works vazio: sem estilos, sem
-- fotografias, sem memória, com o briefing por responder outra vez. O
-- trabalho antigo não se apaga — fica órfão, numa conta a que ela já não
-- chega. É a pior espécie de perda: silenciosa, e do lado de quem paga.
--
-- Agora o CarouselSnap manda também o id dele para a pessoa, e é esse que
-- manda. O email passa a ser um dado como outro qualquer — muda-se quando
-- muda de lá, e a pessoa continua a ser a mesma.
--
-- **O que tem mesmo de sobreviver é o id da conta do Supabase.** Tudo o que é
-- dela — settings, estilos, fotografias, conversas, memória — está preso a
-- esse id. Renomear a conta mantém-no; criar outra perde tudo. Por isso a
-- coluna `auth_id` fica guardada aqui: sem ela, uma mudança de email obrigava
-- a procurar a conta às cegas.

alter table public.membros
  add column if not exists snap_id text,
  add column if not exists auth_id uuid;

-- um id do CarouselSnap pertence a uma pessoa só. O índice parcial deixa
-- conviver as linhas antigas, que ainda não têm id nenhum.
create unique index if not exists membros_snap_id_idx
  on public.membros (snap_id)
  where snap_id is not null;

/**
 * Quem é esta pessoa, pelo id do CarouselSnap.
 *
 * Devolve o email com que ela está registada aqui e o id da conta dela, ou
 * nada se for a primeira vez. Pede o código de sistema, como as outras desta
 * família: não é uma consulta para o browser fazer.
 */
create or replace function public.ver_passagem(c text, snap text)
returns table (email text, auth_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.codigos where upper(codigo) = upper(trim(c)) and ativo
  ) then
    return;
  end if;

  return query
    select m.email, m.auth_id
    from public.membros m
    where m.snap_id = trim(snap)
    limit 1;
end;
$$;

/**
 * A pessoa mudou de email do lado de lá.
 *
 * Só mexe na linha que tem este id do CarouselSnap — nunca procura por email,
 * porque é precisamente o email que deixou de ser de confiança. E recusa-se a
 * pisar a linha de outra pessoa: se o email novo já pertencer a alguém, não
 * faz nada e devolve false, para quem chamou poder parar em vez de juntar
 * duas contas numa.
 */
create or replace function public.renomear_membro(c text, snap text, novo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo text := lower(trim(novo));
begin
  if not exists (
    select 1 from public.codigos where upper(codigo) = upper(trim(c)) and ativo
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.membros m
    where lower(m.email) = alvo and m.snap_id is distinct from trim(snap)
  ) then
    return false;
  end if;

  update public.membros
  set email = alvo
  where snap_id = trim(snap);

  return found;
end;
$$;

/**
 * Guardar quem é quem, depois de a porta abrir.
 *
 * Liga o id do CarouselSnap e o id da conta do Supabase à linha desta pessoa.
 * Corre a cada entrada e não só na primeira: é assim que as linhas antigas —
 * as de quem já cá andava antes disto existir — vão ganhando o id sem
 * ninguém ter de as arranjar à mão.
 */
create or replace function public.ligar_passagem(c text, e text, snap text, auth uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.codigos where upper(codigo) = upper(trim(c)) and ativo
  ) then
    return false;
  end if;

  update public.membros m
  set snap_id = coalesce(nullif(trim(coalesce(snap, '')), ''), m.snap_id),
      auth_id = coalesce(auth, m.auth_id)
  where lower(m.email) = lower(trim(e));

  return found;
end;
$$;

revoke all on function public.ver_passagem(text, text) from public;
revoke all on function public.renomear_membro(text, text, text) from public;
revoke all on function public.ligar_passagem(text, text, text, uuid) from public;
grant execute on function public.ver_passagem(text, text) to authenticated;
grant execute on function public.renomear_membro(text, text, text) to authenticated;
grant execute on function public.ligar_passagem(text, text, text, uuid) to authenticated;
