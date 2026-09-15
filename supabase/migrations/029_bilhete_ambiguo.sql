-- ============================================================
-- O parâmetro e a coluna chamavam-se os dois `bilhete`
-- ============================================================
--
-- A porta do CarouselSnap nunca deixou entrar ninguém. Não por causa do
-- segredo, nem do botão do outro lado, nem da chave de serviço — por causa
-- desta linha, escrita na 024:
--
--     create function gastar_passagem(c text, bilhete text, e text)
--     ...
--       on conflict (bilhete) do nothing;
--
-- O parâmetro chama-se `bilhete`. A coluna da tabela também. Na cláusula
-- `on conflict`, o Postgres tem os dois à frente e não sabe de qual se fala:
--
--     column reference "bilhete" is ambiguous     (42702)
--
-- E o pior desta avaria é quando ela aparece. O plpgsql só resolve os nomes
-- **ao executar**, não ao criar: a migração correu sem uma queixa, a função
-- ficou lá, verde em todos os cartões, e só rebentava no momento em que
-- alguém tentava mesmo entrar.
--
-- ── O arranjo, e porque tem um nome novo ─────────────────────
--
-- O nome de um parâmetro não se pode mudar com `create or replace` — o
-- Postgres recusa. Por isso a função passa a chamar-se `gastar_bilhete`, com
-- o parâmetro `numero`, que não é o nome de nenhuma coluna desta tabela.
--
-- A `gastar_passagem` sai de cena. Não serviu nunca para nada.
--
-- ── E uma porta aberta que ninguém tinha visto ───────────────
--
-- Isto apareceu a olhar para a migração de cima com olhos de quem não confia
-- nela, e é mais grave do que a avaria que ela vinha arranjar.
--
-- Várias destas funções foram dadas a `anon` — a qualquer pessoa da
-- internet, sem sessão nenhuma. Na altura parecia inofensivo: pedem o código
-- de sistema, e quem não o souber não faz nada.
--
-- Só que o código de sistema não é segredo. Os valores por omissão —
-- `CAROUSELSNAP-AUTO`, `HOTMART-AUTO`, `STRIPE-AUTO` — estão escritos no
-- código desta app, e o repositório é público. Quem os ler pode chamá-las.
--
-- Três delas só davam para fazer barulho: encher a tabela `passagens`, a
-- `recusas`, ou varrer bilhetes velhos. Chato, não é grave.
--
-- As outras três são graves, e nenhuma tem guarda nenhuma lá dentro:
--
--   renovar_acesso(c, e, dias)      põe `acesso_ate` onde se quiser e
--                                   `ativo = true`. Quem tenha deixado de
--                                   pagar renova-se a si próprio de graça,
--                                   para sempre; quem tenha sido suspenso
--                                   volta a entrar.
--
--   suspender_por_compra(c, e)      fecha a porta a qualquer pessoa, pelo
--                                   email. Uma maneira de tirar a app a
--                                   quem está a pagar, uma a uma.
--
--   marcar_stripe(c, e, ...)        reescreve a quem pertence uma
--                                   assinatura.
--
-- Nenhuma delas cria acesso do nada — quem dá lugar é o `resgatar_codigo`,
-- e esse tem a guarda certa: para códigos de sistema exige a chave de
-- serviço. Mas mexer no prazo e no `ativo` de quem já existe chega para
-- estragar o negócio nos dois sentidos.
--
-- O `resgatar_codigo` e o `codigo_valido` ficam como estão, e é de propósito:
-- são chamados do browser, na página /acesso, por quem ainda não tem sessão
-- nenhuma e vem resgatar um convite. É para isso que servem.
--
-- As outras seis são chamadas de um sítio só — o servidor desta app, sempre
-- com a chave de serviço. Passam a ser dele.
--
-- Isto vai aqui, e não numa migração à parte, porque é um ficheiro só para
-- correr: partir em dois o que se descobriu ao mesmo tempo é multiplicar as
-- vezes em que alguém corre metade e esquece a outra.

drop function if exists public.gastar_passagem(text, text, text);

/**
 * Gastar um bilhete.
 *
 * Devolve true à primeira vez que vê este número e false em todas as
 * seguintes. A conta e a decisão são a mesma instrução — `on conflict do
 * nothing` mais `found` — porque entre um `select` e um `insert` separados
 * cabem dois pedidos ao mesmo tempo com o mesmo bilhete, e passavam os dois.
 *
 * O parâmetro chama-se `numero` e não `bilhete` por uma razão que custou um
 * dia: `bilhete` é o nome da coluna, e um parâmetro com o nome de uma coluna
 * torna a cláusula `on conflict` ambígua. Quem lhe mexer, não lhe volte a dar
 * o nome de uma coluna desta tabela. O `npm run verificar-sql` queixa-se se
 * alguém o fizer.
 */
create or replace function public.gastar_bilhete(c text, numero text, e text)
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
  values (trim(numero), lower(trim(e)))
  on conflict (bilhete) do nothing;

  return found;
end;
$$;

-- ── quem pode chamar o quê ───────────────────────────────────
--
-- Só o servidor desta app, que fala sempre com a chave de serviço. O
-- `security definer` faz estas funções correrem como dona das tabelas; deixar
-- isso ao alcance de quem não tem sessão é dar a chave a quem bate à porta.

revoke all on function public.gastar_bilhete(text, text, text) from public, anon, authenticated;
grant execute on function public.gastar_bilhete(text, text, text) to service_role;

-- a que escreve o motivo das recusas. Nasceu na 028 aberta a `anon`, e é
-- chamada de um sítio só: o /entrar, com a chave de serviço
revoke all on function public.anotar_recusa(text, text) from public, anon, authenticated;
grant execute on function public.anotar_recusa(text, text) to service_role;

-- a que varre os bilhetes velhos. Nasceu na 024 aberta a `anon`, e não é
-- chamada de lado nenhum — não há razão para ficar ao alcance de quem passa
revoke all on function public.limpar_passagens() from public, anon, authenticated;
grant execute on function public.limpar_passagens() to service_role;

-- ── e as três que mexem no acesso de quem paga ───────────────
--
-- Chamadas pelos avisos da Hotmart e do Stripe, e pela porta do
-- CarouselSnap. Todos servidores, todos com a chave de serviço.

revoke all on function public.renovar_acesso(text, text, int) from public, anon, authenticated;
grant execute on function public.renovar_acesso(text, text, int) to service_role;

revoke all on function public.suspender_por_compra(text, text) from public, anon, authenticated;
grant execute on function public.suspender_por_compra(text, text) to service_role;

revoke all on function public.marcar_stripe(text, text, text, text) from public, anon, authenticated;
grant execute on function public.marcar_stripe(text, text, text, text) to service_role;
