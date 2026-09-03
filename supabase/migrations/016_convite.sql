-- ============================================================
-- The Creator Works — convites por abrir
-- ============================================================

-- Quem é convidado recebe um link por email. Esse link tem de aterrar sempre
-- no mesmo endereço (/auth/callback) — é o único que o Supabase aceita — por
-- isso a informação de que ainda falta escolher a palavra-passe vive aqui, e
-- não no endereço.
alter table public.membros
  add column if not exists convite_pendente boolean not null default false;

-- Uma pessoa precisa de poder dizer "já escolhi a minha palavra-passe" sem
-- poder mexer em mais nada da sua linha.
create or replace function public.convite_aceite()
returns void
language sql
security definer
set search_path = public
as $$
  update public.membros
  set convite_pendente = false
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

revoke all on function public.convite_aceite() from public;
grant execute on function public.convite_aceite() to authenticated;
