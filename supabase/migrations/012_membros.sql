-- ============================================================
-- The Creator Works — quem entra, e com que papel
-- ============================================================

-- A lista de pessoas com acesso. O email é a chave: pode convidar-se alguém
-- antes de essa pessoa se registar, e quando ela entrar já cá encontra o
-- lugar feito.
create table if not exists public.membros (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  nome          text,
  papel         text not null default 'aluno' check (papel in ('admin', 'suporte', 'aluno')),
  ativo         boolean not null default true,
  convidado_por text,
  ultimo_acesso timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists membros_email_idx on public.membros (lower(email));

-- A dona entra sempre, e é sempre admin.
insert into public.membros (email, nome, papel)
values ('catiacreator@gmail.com', 'Cátia', 'admin')
on conflict (email) do update set papel = 'admin', ativo = true;

-- ── as duas funções que evitam a recursão nas políticas ──────
-- Uma política que consultasse a própria tabela chamaria a política outra
-- vez, sem fim. Com security definer, a leitura faz-se por baixo do RLS.

create or replace function public.papel_de(e text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select papel from public.membros
  where lower(email) = lower(e) and ativo
  limit 1;
$$;

create or replace function public.sou_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.papel_de(auth.jwt() ->> 'email') = 'admin', false);
$$;

alter table public.membros enable row level security;

-- Cada pessoa vê a sua linha; a admin vê e mexe em todas.
drop policy if exists "ver_a_minha_linha" on public.membros;
create policy "ver_a_minha_linha" on public.membros
  for select using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) or public.sou_admin()
  );

drop policy if exists "admin_gere_membros" on public.membros;
create policy "admin_gere_membros" on public.membros
  for all using (public.sou_admin()) with check (public.sou_admin());
