-- ============================================================
-- CCreator Lab — Última hora
-- ============================================================

-- Cada linha é um assunto em alta, já convertido em dois ângulos de carrossel.
create table if not exists public.hot_topics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  categoria    text not null,          -- 'nicho', 'ferramentas', 'plataforma'…
  assunto      text not null,
  fonte        text,                   -- onde foi visto
  url          text,
  porque       text not null,          -- porque está a dar que falar
  angulos      jsonb not null default '[]',  -- [{titulo, gancho, tipo}]
  usado_em     uuid references public.carousels(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists hot_topics_user_idx
  on public.hot_topics (user_id, created_at desc);

alter table public.hot_topics enable row level security;

drop policy if exists "own_hot_topics" on public.hot_topics;
create policy "own_hot_topics" on public.hot_topics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
