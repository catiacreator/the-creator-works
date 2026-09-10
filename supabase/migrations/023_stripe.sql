-- ============================================================
-- The Creator Works — as mensalidades pelo Stripe
-- ============================================================

-- A máquina já existia para a Hotmart: um código de sistema que só vive no
-- servidor, `resgatar_codigo` a dar o lugar, `renovar_acesso` a empurrar o
-- prazo e `suspender_por_compra` a fechar a porta.
--
-- O Stripe entra pela mesma porta, com o seu próprio código. Assim, olhando
-- para os usos de cada um, vê-se quantas entraram por onde.

insert into public.codigos (codigo, papel, nota, usos_max, criado_por)
values ('STRIPE-AUTO', 'aluno', 'Mensalidades do Stripe', 100000, 'sistema')
on conflict (codigo) do update set ativo = true, usos_max = 100000;

-- Quem é quem lá do lado. Não é preciso para dar ou tirar acesso — isso faz-se
-- pelo email — mas é o que permite ir do painel da app ao painel do Stripe sem
-- andar à procura, e reconhecer uma pessoa que mudou de email.
alter table public.membros
  add column if not exists stripe_cliente text,
  add column if not exists stripe_assinatura text;

create index if not exists membros_stripe_cliente_idx
  on public.membros (stripe_cliente);

/**
 * Guardar quem é a pessoa no Stripe.
 *
 * Pede o mesmo código de sistema das outras funções: só o servidor o tem.
 */
create or replace function public.marcar_stripe(
  c text,
  e text,
  cliente text,
  assinatura text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  existe boolean;
begin
  select exists (
    select 1 from public.codigos where upper(codigo) = upper(trim(c)) and ativo
  ) into existe;

  if not existe then
    return false;
  end if;

  update public.membros
  set stripe_cliente = coalesce(nullif(trim(cliente), ''), stripe_cliente),
      stripe_assinatura = coalesce(nullif(trim(assinatura), ''), stripe_assinatura)
  where lower(email) = lower(trim(e));

  return found;
end;
$$;

revoke all on function public.marcar_stripe(text, text, text, text) from public;
grant execute on function public.marcar_stripe(text, text, text, text) to anon, authenticated;

/**
 * Marcar a data de acesso à mão, do painel de Admin.
 *
 * O webhook trata das renovações sozinho, mas há sempre o caso de se querer
 * dar uns dias a alguém, ou corrigir uma cobrança que se perdeu. Isto corre
 * como a pessoa que está a pedir — a política de RLS da tabela é que decide
 * se ela pode — e por isso não leva código nenhum.
 */
create or replace function public.marcar_acesso_ate(m uuid, ate date)
returns date
language sql
security invoker
set search_path = public
as $$
  update public.membros set acesso_ate = ate where id = m returning acesso_ate;
$$;
