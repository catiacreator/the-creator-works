import { createClient } from '@supabase/supabase-js';

/**
 * Cliente com service-role. Só para o worker da fila (/api/jobs/run),
 * que corre sem sessão de utilizador. Nunca importar em código de cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * O cliente de um aviso de venda — Hotmart, Stripe, CarouselSnap.
 *
 * Prefere a chave de serviço, porque os códigos de sistema deixaram de valer
 * para quem fala como browser. Mas se ela não estiver posta no ambiente,
 * volta à chave pública em vez de rebentar: até a migração 024 correr, a
 * chave pública ainda dá acesso, e um aviso de venda que falha em silêncio é
 * uma pessoa que pagou e não entrou.
 *
 * Quando as duas coisas se desencontrarem — migração corrida, chave por pôr —
 * o acesso deixa de ser dado, e é preciso que isso apareça em algum lado.
 */
export function createClienteDeVendas() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return createAdminClient();

  console.error(
    '[vendas] SUPABASE_SERVICE_ROLE_KEY por pôr — a usar a chave pública. ' +
      'Depois da migração 024 isto deixa de dar acesso a quem paga.',
  );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
