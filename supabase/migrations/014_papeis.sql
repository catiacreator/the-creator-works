-- ============================================================
-- The Creator Works — o que cada papel pode fazer
-- ============================================================

-- A tabela dos papéis deixa de estar escrita no código: é a admin que a
-- decide, na página de Admin. O código só traz os valores de partida.
create table if not exists public.papeis (
  id          text primary key check (id in ('admin', 'suporte', 'aluno')),
  permissoes  text[] not null default '{}',
  atualizado  timestamptz not null default now()
);

insert into public.papeis (id, permissoes) values
  ('admin',   array['criar','memoria','ultima-hora','analise','ver-pessoas','gerir-pessoas']),
  ('suporte', array['criar','memoria','ultima-hora','analise','ver-pessoas']),
  ('aluno',   array['criar','memoria'])
on conflict (id) do nothing;

alter table public.papeis enable row level security;

-- Toda a gente que entrou precisa de saber o que pode fazer; mexer, só a admin.
drop policy if exists "ver_papeis" on public.papeis;
create policy "ver_papeis" on public.papeis for select using (auth.uid() is not null);

drop policy if exists "admin_muda_papeis" on public.papeis;
create policy "admin_muda_papeis" on public.papeis
  for all using (public.sou_admin()) with check (public.sou_admin());
