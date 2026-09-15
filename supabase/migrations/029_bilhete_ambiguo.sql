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
-- alguém tentava mesmo entrar. Nesse momento a pessoa via uma página a dizer
-- que a ligação não servia, e ia-se embora.
--
-- Custou um dia inteiro a encontrar, e o que o encontrou não foi engenho
-- nenhum: foi passar a escrever o motivo das recusas onde se pudesse ler.
--
-- ── O arranjo, e porque tem um nome novo ─────────────────────
--
-- O nome do parâmetro não se pode mudar com `create or replace` — o Postgres
-- recusa. E dar-lhe outro nome na mesma função obrigaria a dropar e recriar,
-- deixando uma janela em que o código publicado chama uma coisa que já não
-- existe com aquele feitio.
--
-- Por isso a função passa a chamar-se `gastar_bilhete`, com o parâmetro
-- `numero` — um nome que nenhuma coluna desta tabela tem, nem é provável que
-- venha a ter. Enquanto esta migração não correr, o código novo chama uma
-- função que não existe e diz-se isso em português, com o ficheiro a correr;
-- é um erro que se lê, e não um silêncio.
--
-- A `gastar_passagem` sai de cena. Não serviu nunca para nada.

drop function if exists public.gastar_passagem(text, text, text);

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
 *
 * O parâmetro chama-se `numero` e não `bilhete` por uma razão que custou um
 * dia: `bilhete` é o nome da coluna, e um parâmetro com o nome de uma coluna
 * torna a cláusula `on conflict` ambígua. Quem lhe mexer, não lhe volte a dar
 * o nome de uma coluna desta tabela.
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

revoke all on function public.gastar_bilhete(text, text, text) from public;
grant execute on function public.gastar_bilhete(text, text, text) to anon, authenticated;
