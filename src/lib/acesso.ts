import type { SupabaseClient } from '@supabase/supabase-js';
import type { Papel } from './papeis';

/**
 * Quem entra.
 *
 * A app é privada e tem dona. A lista de quem tem acesso vive na tabela
 * `membros` — é a página de Admin que a gere — e é consultada em cada pedido,
 * no middleware. O email da dona fica aqui como rede de segurança: se a
 * tabela ainda não existir, ou se alguém se enganar a mexer nela, ela nunca
 * fica fechada fora de casa.
 */
const DONA = (
  process.env.NEXT_PUBLIC_EMAIL_DA_DONA ?? 'catiacreator@gmail.com'
).toLowerCase();

export function eADona(email?: string | null) {
  return !!email && email.trim().toLowerCase() === DONA;
}

/** Contas de serviço que só existem fora de produção. */
function emailDeConstrucao(email?: string | null) {
  if (process.env.NODE_ENV === 'production') return false;
  const dev = (process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? 'dev@carrossellab.dev').toLowerCase();
  return !!email && email.trim().toLowerCase() === dev;
}

export interface Acesso {
  papel: Papel;
  ativo: boolean;
}

/**
 * O papel de quem está a bater à porta.
 * Devolve null a quem não tem lugar nenhum — e é isso que fecha a porta.
 */
export async function acessoDe(
  supabase: SupabaseClient,
  email?: string | null,
): Promise<Acesso | null> {
  if (!email) return null;

  try {
    const { data, error } = await supabase
      .from('membros')
      .select('papel, ativo')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error) throw error;
    if (data) return data.ativo ? { papel: data.papel as Papel, ativo: true } : null;
  } catch {
    // a tabela ainda não existe (migração por correr) — a dona entra à mesma
  }

  if (eADona(email) || emailDeConstrucao(email)) return { papel: 'admin', ativo: true };
  return null;
}

/** O que se mostra a quem bate à porta sem ser convidado. */
export const RECADO_SEM_ACESSO = 'Esta app é privada. Esta conta não tem acesso.';
