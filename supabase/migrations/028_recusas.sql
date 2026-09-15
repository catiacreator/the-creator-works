-- ============================================================
-- O registo das recusas da porta
-- ============================================================
--
-- A porta do CarouselSnap recusa um bilhete por sete razões diferentes, e a
-- quem bate à porta diz sempre a mesma coisa. Isso está certo: explicar qual
-- das contas falhou é ensinar a forjar o próximo bilhete.
--
-- Mas o preço disso caiu todo em cima da Cátia. Ela carrega no botão do
-- CarouselSnap, vê a página que diz «a ligação já não serve», e essa frase
-- é um palpite — o motivo verdadeiro podia ser o segredo estar diferente nas
-- duas apps, o relógio de um dos lados estar trocado, a chave de serviço
-- estar por pôr. Sete causas, sete arranjos, e uma frase que aponta para um
-- deles ao calhas.
--
-- O motivo verdadeiro já era escrito — mas para os registos do servidor, que
-- é um sítio onde ela não vai. Esta tabela põe-no onde ela vai: no cartão da
-- porta, em Admin.
--
-- Guarda-se pouco e por pouco tempo. O motivo é uma frase escrita por nós,
-- de uma lista fechada — nunca texto vindo de fora. O email só se guarda
-- quando a assinatura bateu: antes disso o bilhete não é de confiança, e um
-- email que vem num bilhete forjado é um email que alguém escolheu.

create table if not exists public.recusas (
  id uuid primary key default gen_random_uuid(),
  -- o motivo, das nossas palavras: 'assinatura não bate', 'bilhete já usado'…
  porque text not null,
  -- só quando a assinatura bateu. Nulo quando não se pode confiar no bilhete.
  email text,
  quando timestamptz not null default now()
);

create index if not exists recusas_quando_idx on public.recusas (quando desc);

alter table public.recusas enable row level security;

-- Ninguém escreve isto a partir do browser: quem escreve é a função abaixo,
-- e quem a chama é a porta, no servidor. Ler, só a admin.
revoke all on table public.recusas from anon, authenticated;
grant select on table public.recusas to authenticated;

drop policy if exists recusas_admin_le on public.recusas;
create policy recusas_admin_le on public.recusas
  for select using (public.sou_admin());

/**
 * Anotar uma recusa.
 *
 * Apaga o que tem mais de sete dias na mesma instrução. Um registo destes
 * serve para arranjar o que está partido hoje; guardar meses disto era juntar
 * uma lista de emails que ninguém vai ler.
 *
 * O `drop` antes do `create` não é cerimónia: um `create or replace` com uma
 * lista de parâmetros diferente não substitui nada — cria uma segunda função
 * com o mesmo nome, e a partir daí cada chamada é ambígua. Já aconteceu aqui,
 * na 025, e não deu erro nenhum até ser tarde.
 */
drop function if exists public.anotar_recusa(text, text);

create or replace function public.anotar_recusa(porque text, e text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.recusas (porque, email)
  values (
    left(trim(porque), 200),
    nullif(lower(trim(coalesce(e, ''))), '')
  );

  delete from public.recusas where quando < now() - interval '7 days';
end;
$$;

revoke all on function public.anotar_recusa(text, text) from public;
grant execute on function public.anotar_recusa(text, text) to anon, authenticated;
