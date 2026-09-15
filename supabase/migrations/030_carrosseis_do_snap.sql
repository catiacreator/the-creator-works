-- ============================================================
-- Os carrosséis do CarouselSnap passam a ter onde ficar
-- ============================================================
--
-- Até agora os slides que saem do Drop Content viajavam na memória do
-- separador — `sessionStorage`. Chegavam ao Estúdio, desenhavam-se, e
-- desapareciam quando o separador fechava. Quem escrevesse um carrossel à
-- noite e o quisesse ver de manhã não o encontrava.
--
-- ── Porque é que esta tabela tem nomes em inglês ─────────────
--
-- Tudo o resto nesta base de dados está em português, e isto destoa de
-- propósito. Esta é a tabela do CarouselSnap, copiada da dele coluna a
-- coluna: `carousel_history`, `carousel_data`, `palette_id`, `font_id`,
-- `visual_layout`, `slide_format`, `deleted_at`. Está aqui tal e qual.
--
-- A razão é prática. O Snap dela tem anos de carrosséis guardados numa
-- tabela com esta forma. No dia em que eles vierem para cá, a diferença
-- entre um `insert ... select` de uma linha e uma tradução de colunas à mão
-- é a diferença entre uma tarde e um problema. Um nome torto agora poupa uma
-- migração torta depois.
--
-- E fica sozinha: não toca em nenhuma tabela do Creator Works, nem nenhuma
-- delas toca nesta. São duas divisões da mesma casa, e a regra é essa.
--
-- ── O apagar é de mentira ────────────────────────────────────
--
-- Como no Snap: apagar escreve `deleted_at` e a linha fica. Um carrossel que
-- levou uma tarde a escrever não deve desaparecer porque alguém carregou no
-- sítio errado — e o Snap já tinha decidido isto antes de mim.

create table if not exists public.carousel_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  carousel_data jsonb not null,
  palette_id text,
  font_id text,
  visual_layout text,
  slide_format text default '1:1',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- por onde a listagem procura sempre: os meus, os vivos, do mais novo ao
-- mais velho
create index if not exists carousel_history_dono
  on public.carousel_history (user_id, created_at desc)
  where deleted_at is null;

alter table public.carousel_history enable row level security;

-- As políticas do Snap, com uma diferença: lá o `update` não estava lá
-- (o soft delete entrou depois numa migração que não lhe mexeu), e sem ele
-- ninguém consegue apagar nada nem mudar um título. Fica cá.

drop policy if exists "carrosseis: ler os meus" on public.carousel_history;
create policy "carrosseis: ler os meus"
  on public.carousel_history for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "carrosseis: guardar os meus" on public.carousel_history;
create policy "carrosseis: guardar os meus"
  on public.carousel_history for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "carrosseis: mexer nos meus" on public.carousel_history;
create policy "carrosseis: mexer nos meus"
  on public.carousel_history for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
