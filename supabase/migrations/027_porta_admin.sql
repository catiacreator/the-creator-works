-- ============================================================
-- The Creator Works — a porta de serviço da admin
-- ============================================================
--
-- Desde que a entrada passou a ser pelo CarouselSnap, a Cátia entra como
-- todos os outros: vai ao CarouselSnap e salta de lá para cá. Funciona — até
-- ao dia em que ela precisa de entrar e o CarouselSnap está em baixo, ou está
-- num computador onde não tem a sessão dele, ou está a arranjar precisamente
-- a ligação entre os dois.
--
-- Esta é a porta de serviço para esses dias: um código que ela escolhe, escrito
-- numa página à parte, e a sessão abre-se sem passar pelo outro lado.
--
-- Uma porta destas é a coisa mais perigosa que esta app tem. Abre tudo, e
-- basta uma linha de texto para a abrir. Por isso:
--
-- 1. **O código nunca é guardado.** Guarda-se um `scrypt` dele com sal
--    próprio. Quem levar esta tabela leva trabalho, não leva a chave.
-- 2. **Só existe se ela a criar.** Sem linha nesta tabela não há porta — e
--    apagar a linha fecha-a de vez.
-- 3. **Só serve a quem é admin.** A conta é conferida no momento de entrar e
--    não no momento de criar o código: se um dia ela deixar de ser admin, a
--    chave dela deixa de abrir nada.
-- 4. **Conta-se quem bate à porta.** Cada tentativa fica registada, com hora
--    e origem, e cinco erros da mesma origem fecham-na por um quarto de hora.
--    É também assim que ela vê, no Admin, se alguém andou a tentar.
-- 5. **Ninguém lê isto pelo browser.** Nem a própria. As funções que
--    precisam do sal e do resumo só correm com a chave de serviço.

-- ── as chaves ────────────────────────────────────────────────
create table if not exists public.chaves_admin (
  email text primary key,
  -- o sal e o resumo do scrypt. O código em si não está aqui nem em lado
  -- nenhum: se ela o esquecer, põe outro.
  sal text not null,
  resumo text not null,
  criada_em timestamptz not null default now(),
  ultimo_uso timestamptz
);

alter table public.chaves_admin enable row level security;

-- Sem policy nenhuma de propósito: RLS ligado e nada permitido quer dizer
-- que nem a dona da conta lê a própria linha a partir do browser. Quem lhe
-- toca são as funções aqui em baixo, e cada uma decide o que devolve.
revoke all on table public.chaves_admin from anon, authenticated;

-- ── quem bateu à porta ───────────────────────────────────────
create table if not exists public.porta_admin_tentativas (
  id bigserial primary key,
  quando timestamptz not null default now(),
  -- o endereço de onde veio, quando o servidor o sabe
  origem text,
  acertou boolean not null default false
);

create index if not exists porta_admin_tentativas_quando_idx
  on public.porta_admin_tentativas (quando desc);

alter table public.porta_admin_tentativas enable row level security;
revoke all on table public.porta_admin_tentativas from anon, authenticated;

-- ============================================================
-- O que a admin faz, com a sessão dela
-- ============================================================

/**
 * Pôr ou trocar a chave.
 *
 * Escreve sempre na linha de quem está a chamar — nunca na de outra pessoa.
 * O email vem do `auth.jwt()`, não de um argumento: um argumento era uma
 * maneira de uma admin pôr uma chave na conta de outra.
 *
 * O sal e o resumo são calculados do lado do servidor, em Node. Aqui só se
 * guardam.
 */
create or replace function public.guardar_chave_admin(sal text, resumo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  quem text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if quem = '' or not public.sou_admin() then
    return false;
  end if;

  if coalesce(trim(sal), '') = '' or coalesce(trim(resumo), '') = '' then
    return false;
  end if;

  insert into public.chaves_admin (email, sal, resumo, criada_em, ultimo_uso)
  values (quem, trim(sal), trim(resumo), now(), null)
  on conflict (email) do update
    set sal = excluded.sal,
        resumo = excluded.resumo,
        criada_em = now(),
        -- chave nova é porta nova: o último uso da antiga não diz nada sobre esta
        ultimo_uso = null;

  return true;
end;
$$;

/** Fechar a porta. Apaga a chave de quem está a chamar. */
create or replace function public.apagar_chave_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  quem text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if quem = '' or not public.sou_admin() then
    return false;
  end if;

  delete from public.chaves_admin where email = quem;
  return true;
end;
$$;

/**
 * Como está a minha porta.
 *
 * Devolve se há chave, de quando é, quando foi usada da última vez, e quantas
 * tentativas erradas houve no último dia — o suficiente para ela perceber que
 * alguém andou a tentar, sem devolver nada que sirva para forjar a chave.
 *
 * Nunca devolve o sal nem o resumo.
 */
create or replace function public.ver_chave_admin()
returns table (tem boolean, criada_em timestamptz, ultimo_uso timestamptz, erros_hoje bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  quem text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if quem = '' or not public.sou_admin() then
    return;
  end if;

  return query
    select
      exists (select 1 from public.chaves_admin k where k.email = quem),
      (select k.criada_em from public.chaves_admin k where k.email = quem),
      (select k.ultimo_uso from public.chaves_admin k where k.email = quem),
      (select count(*) from public.porta_admin_tentativas t
        where not t.acertou and t.quando > now() - interval '1 day');
end;
$$;

-- ============================================================
-- O que a porta faz, com a chave de serviço
-- ============================================================

/**
 * As chaves que existem, para a porta as poder conferir.
 *
 * Isto devolve sal e resumo — é a coisa mais sensível desta migração. Por
 * isso não é para `authenticated`: só a chave de serviço a executa, e o
 * código de sistema é uma segunda tranca por cima disso.
 *
 * Devolve só as chaves de contas que são admin e estão ativas agora. Uma
 * chave de quem deixou de ser admin não abre: a pergunta «esta pessoa pode
 * entrar?» responde-se no momento de entrar, não no de guardar o código.
 */
create or replace function public.chaves_da_porta(c text)
returns table (email text, sal text, resumo text)
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
    select k.email, k.sal, k.resumo
    from public.chaves_admin k
    join public.membros m on lower(m.email) = k.email
    where m.papel = 'admin' and m.ativo;
end;
$$;

/**
 * Está a porta trancada de tanto se errar?
 *
 * Cinco erros da mesma origem em quinze minutos e fecha. A conta é por
 * origem e não global de propósito: um travão global era uma maneira de
 * qualquer pessoa trancar a Cátia do lado de fora — bastava errar cinco
 * vezes de propósito.
 *
 * Sem origem conhecida, conta-se como uma origem só («?»), que é o pior caso
 * e o mais seguro.
 */
create or replace function public.porta_admin_travada(c text, origem text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  quantos int;
begin
  if not exists (
    select 1 from public.codigos where upper(codigo) = upper(trim(c)) and ativo
  ) then
    return true;
  end if;

  select count(*) into quantos
  from public.porta_admin_tentativas t
  where not t.acertou
    and coalesce(t.origem, '?') = coalesce(nullif(trim(origem), ''), '?')
    and t.quando > now() - interval '15 minutes';

  return quantos >= 5;
end;
$$;

/**
 * Registar quem bateu.
 *
 * Corre sempre, acerte ou erre: são as tentativas certas que dizem à Cátia
 * que a porta funciona, e as erradas que lhe dizem que alguém a procurou.
 * Aproveita para varrer o que já tem mais de trinta dias — isto é um registo,
 * não um arquivo.
 */
create or replace function public.porta_admin_registar(c text, origem text, acertou boolean)
returns void
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

  insert into public.porta_admin_tentativas (origem, acertou)
  values (nullif(trim(coalesce(origem, '')), ''), coalesce(acertou, false));

  delete from public.porta_admin_tentativas where quando < now() - interval '30 days';
end;
$$;

/**
 * Abrir a porta a esta admin.
 *
 * Confere outra vez que ela é admin e está ativa — a porta não confia no que
 * lhe disseram, nem na conferência que já foi feita para lhe ir buscar a
 * chave.
 *
 * Sobre o prazo: se a linha dela tem prazo e ele já passou, empurra-se, para
 * o middleware não a mandar para a página de renovação a seguir. Se **não**
 * tem prazo, não se lhe põe nenhum — pôr um era transformar uma conta sem
 * validade numa conta com validade, e fechar-lhe a porta dali a uns dias por
 * ter entrado por aqui uma vez.
 */
create or replace function public.porta_admin_abrir(c text, e text, dias int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo text := lower(trim(e));
  linha public.membros;
begin
  if not exists (
    select 1 from public.codigos where upper(codigo) = upper(trim(c)) and ativo
  ) then
    return false;
  end if;

  select * into linha from public.membros m where lower(m.email) = alvo;
  if not found or linha.papel <> 'admin' or not linha.ativo then
    return false;
  end if;

  if linha.acesso_ate is not null and linha.acesso_ate < current_date then
    update public.membros
    set acesso_ate = current_date + greatest(1, coalesce(dias, 7))
    where lower(email) = alvo;
  end if;

  update public.chaves_admin set ultimo_uso = now() where email = alvo;

  return true;
end;
$$;

-- ── quem pode chamar o quê ───────────────────────────────────
-- As três primeiras são para ela, com a sessão dela.
revoke all on function public.guardar_chave_admin(text, text) from public;
revoke all on function public.apagar_chave_admin() from public;
revoke all on function public.ver_chave_admin() from public;
grant execute on function public.guardar_chave_admin(text, text) to authenticated;
grant execute on function public.apagar_chave_admin() to authenticated;
grant execute on function public.ver_chave_admin() to authenticated;

-- As quatro da porta são só para a chave de serviço. `authenticated` não
-- entra aqui: `chaves_da_porta` devolve o sal e o resumo, e isso não pode
-- estar ao alcance de uma sessão qualquer que descubra o nome do código.
revoke all on function public.chaves_da_porta(text) from public, anon, authenticated;
revoke all on function public.porta_admin_travada(text, text) from public, anon, authenticated;
revoke all on function public.porta_admin_registar(text, text, boolean) from public, anon, authenticated;
revoke all on function public.porta_admin_abrir(text, text, int) from public, anon, authenticated;
grant execute on function public.chaves_da_porta(text) to service_role;
grant execute on function public.porta_admin_travada(text, text) to service_role;
grant execute on function public.porta_admin_registar(text, text, boolean) to service_role;
grant execute on function public.porta_admin_abrir(text, text, int) to service_role;
