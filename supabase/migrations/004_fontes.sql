-- ============================================================
-- CCreator Lab — as fontes de cada pessoa
-- ============================================================

-- Ficam guardadas no perfil: sobrevivem a logout, a outro computador,
-- a tudo. O ficheiro vai para o bucket `assets`, como as fotografias.
create table if not exists public.fonts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,                       -- "Advercase"
  weight        int  not null default 400,           -- 400 normal, 700 bold
  storage_path  text not null,                       -- .ttf, para o motor compor
  web_path      text,                                -- o original, para o browser
  created_at    timestamptz not null default now()
);

create index if not exists fonts_user_idx on public.fonts (user_id, name, weight);

alter table public.fonts enable row level security;

drop policy if exists "own_fonts" on public.fonts;
create policy "own_fonts" on public.fonts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
