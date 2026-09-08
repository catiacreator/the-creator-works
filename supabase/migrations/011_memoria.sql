-- ============================================================
-- The Creator Works — Memória da Cát.IA
-- ============================================================

-- O que a Cát.IA sabe sobre ela e passa a respeitar em tudo o que escreve.
-- Quatro tipos, por ordem de peso: as regras são ordens, o resto é contexto.
create table if not exists public.memorias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tipo        text not null check (tipo in ('regra', 'aprendizagem', 'preferencia', 'estilo')),
  conteudo    text not null,
  importancia int  not null default 3 check (importancia between 1 and 5),
  origem      text,                    -- 'manual', 'feedback', 'diagnostico'…
  created_at  timestamptz not null default now()
);

create index if not exists memorias_user_idx
  on public.memorias (user_id, importancia desc, created_at desc);

alter table public.memorias enable row level security;

drop policy if exists "own_memorias" on public.memorias;
create policy "own_memorias" on public.memorias
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- O que ela anda a vender agora. Serve para o conteúdo apontar ao mesmo sítio.
create table if not exists public.campanhas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  descricao   text,                    -- a promessa, em uma linha
  produto     text,
  inicio      date not null,
  fim         date not null,
  ativa       boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists campanhas_user_idx
  on public.campanhas (user_id, inicio desc);

alter table public.campanhas enable row level security;

drop policy if exists "own_campanhas" on public.campanhas;
create policy "own_campanhas" on public.campanhas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- O banco de histórias reais. É daqui que sai o storytelling que é mesmo dela.
create table if not exists public.historias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titulo      text not null,
  historia    text not null,
  created_at  timestamptz not null default now()
);

create index if not exists historias_user_idx
  on public.historias (user_id, created_at desc);

alter table public.historias enable row level security;

drop policy if exists "own_historias" on public.historias;
create policy "own_historias" on public.historias
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
