-- ============================================================
-- CCreator Lab — análises de perfil
-- ============================================================

create table if not exists public.profile_analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  handle      text not null,               -- @ analisado
  dados       jsonb not null default '{}', -- o que foi enviado (bio, destaques…)
  analise     text not null,               -- o relatório
  created_at  timestamptz not null default now()
);

create index if not exists analyses_user_idx
  on public.profile_analyses (user_id, created_at desc);

alter table public.profile_analyses enable row level security;

drop policy if exists "own_analyses" on public.profile_analyses;
create policy "own_analyses" on public.profile_analyses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
