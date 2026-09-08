-- ============================================================
-- The Creator Works — que páginas estão abertas
-- ============================================================

-- Uma linha por página que a admin queira esconder ou pôr em manutenção.
-- O que não estiver aqui está aberto: a ausência é o normal.
create table if not exists public.paginas (
  caminho    text primary key,
  escondida  boolean not null default false,
  manutencao boolean not null default false,
  atualizado timestamptz not null default now()
);

alter table public.paginas enable row level security;

drop policy if exists "ver_paginas" on public.paginas;
create policy "ver_paginas" on public.paginas for select using (auth.uid() is not null);

drop policy if exists "admin_muda_paginas" on public.paginas;
create policy "admin_muda_paginas" on public.paginas
  for all using (public.sou_admin()) with check (public.sou_admin());
