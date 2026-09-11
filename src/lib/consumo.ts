import type { SupabaseClient } from '@supabase/supabase-js';
import { acessoDe } from './acesso';

/**
 * O tecto de pedidos à Cát.IA, por pessoa e por mês.
 *
 * Duzentos é um número escolhido para não se dar por ele: quem trabalha
 * todos os dias faz uns trinta ou quarenta. Serve para travar o caso raro em
 * que alguém — ou alguma coisa com a sessão de alguém — carrega no botão
 * sem parar e leva a mensalidade toda em API num fim de semana.
 *
 * A conta é feita na base de dados, numa instrução só (ver a migração 022),
 * para dois pedidos ao mesmo tempo não passarem os dois pelo tecto.
 */
export const TECTO_MENSAL = 200;

/** O nome com que cada pedido fica registado, para depois se ver onde foi. */
export type Acao =
  | 'carrossel'
  | 'roteiro'
  | 'conversa'
  | 'ultima-hora'
  | 'ganchos'
  | 'perfil'
  | 'separar'
  | 'ler';

/**
 * Marca mais um pedido, ou recusa.
 *
 * Chama-se **antes** de falar com a IA — de nada serve contar o que já se
 * gastou. Quem administra a app não é travado: é ela que testa, e ficar
 * fechada de fora da sua própria app por ter experimentado demais seria
 * absurdo.
 *
 * Se a migração ainda não tiver corrido, deixa passar. Um tecto que ainda
 * não existe não é motivo para a app deixar de escrever.
 */
export async function marcarConsumo(
  supabase: SupabaseClient,
  email: string | null | undefined,
  acao: Acao,
  /** Um lote de dez carrosséis são dez pedidos, não um. */
  quantos = 1,
): Promise<void> {
  const acesso = await acessoDe(supabase, email);
  if (acesso?.papel === 'admin') return;

  const { data, error } = await supabase.rpc('marcar_consumo', {
    acao,
    tecto: TECTO_MENSAL,
    quantos,
  });

  if (error) return; // migração por correr, ou a base em baixo: não trava

  const linha = Array.isArray(data) ? data[0] : data;
  if (linha && linha.coube === false) {
    throw new Error(
      quantos > 1
        ? `Não cabem mais ${quantos} pedidos no que resta dos ${TECTO_MENSAL} deste mês. Tenta um lote mais pequeno, ou espera pelo dia 1.`
        : `Chegaste aos ${TECTO_MENSAL} pedidos à Cát.IA deste mês. O contador volta a zero no dia 1. ` +
          'A Fábrica de carrosséis, o Editor e a Biblioteca continuam a funcionar — esses não passam pela IA.',
    );
  }
}
