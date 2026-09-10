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
  /** dia em que o acesso caduca; nulo quer dizer sem prazo */
  ate: string | null;
}

/**
 * Porque é que a porta está fechada.
 *
 * Não é a mesma coisa nunca se ter tido lugar e ter-se deixado de pagar. À
 * primeira não se deve nada a ninguém; à segunda deve-se uma explicação e um
 * caminho de volta — e o caminho de volta é pagar.
 */
export type PortaFechada = 'sem-lugar' | 'suspensa' | 'caducada';

export interface SemAcesso {
  motivo: PortaFechada;
  /** o dia em que caducou, quando foi isso que aconteceu */
  ate?: string | null;
}

/**
 * O papel de quem está a bater à porta.
 * Devolve null a quem não tem lugar nenhum — e é isso que fecha a porta.
 */
export async function acessoDe(
  supabase: SupabaseClient,
  email?: string | null,
): Promise<Acesso | null> {
  const r = await estadoDoAcesso(supabase, email);
  return 'papel' in r ? r : null;
}

/**
 * O mesmo, mas a dizer porque é que fechou.
 *
 * O middleware precisa de saber a diferença: a quem caducou mostra-se a
 * página de renovação, a quem nunca teve lugar mostra-se a porta.
 */
export async function estadoDoAcesso(
  supabase: SupabaseClient,
  email?: string | null,
): Promise<Acesso | SemAcesso> {
  if (!email) return { motivo: 'sem-lugar' };

  try {
    const { data, error } = await supabase
      .from('membros')
      .select('papel, ativo, acesso_ate')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error) throw error;

    if (data) {
      if (!data.ativo) return { motivo: 'suspensa' };

      // a validade fecha a porta sozinha: se o Stripe deixar de avisar que a
      // mensalidade foi paga, o prazo passa e o acesso acaba aqui, sem
      // ninguém ter de o ir tirar à mão
      const ate = data.acesso_ate as string | null;
      if (ate && ate < new Date().toISOString().slice(0, 10)) {
        return { motivo: 'caducada', ate };
      }

      return { papel: data.papel as Papel, ativo: true, ate };
    }
  } catch {
    // a tabela ainda não existe (migração por correr) — a dona entra à mesma
  }

  if (eADona(email) || emailDeConstrucao(email)) {
    return { papel: 'admin', ativo: true, ate: null };
  }
  return { motivo: 'sem-lugar' };
}

/** O que se mostra a quem bate à porta sem ser convidado. */
export const RECADO_SEM_ACESSO = 'Esta app é privada. Esta conta não tem acesso.';

/** O que se diz a quem deixou de pagar. */
export const RECADO_CADUCADO =
  'A tua assinatura está por renovar. Renova para voltares a entrar.';
