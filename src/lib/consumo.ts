import type { SupabaseClient } from '@supabase/supabase-js';
import { acessoDe } from './acesso';
import { CUSTOS, TECTO_CREDITOS, custo, type Acao } from './creditos';

/**
 * O tecto de créditos, por pessoa e por mês.
 *
 * Cada coisa que passa pela IA custa créditos, e custa em proporção ao
 * trabalho que dá — a tabela está em `creditos.ts`, que é também de onde a
 * app tira o que mostra à pessoa. Aqui é só a cobrança.
 *
 * A conta é feita na base de dados, numa instrução só (ver a migração 022),
 * para dois pedidos ao mesmo tempo não passarem os dois pelo tecto.
 */
export { TECTO_CREDITOS, CUSTOS };
export type { Acao };

/**
 * Cobra o que isto custa, ou recusa.
 *
 * Chama-se **antes** de falar com a IA — de nada serve contar o que já se
 * gastou. E chama-se só quando a IA vai mesmo ser chamada: cobrar por um
 * caminho que não passa pela IA é cobrar por nada.
 *
 * Quem administra a app não é travado: é ela que testa, e ficar fechada de
 * fora da sua própria app por ter experimentado demais seria absurdo.
 *
 * Se a migração ainda não tiver corrido, deixa passar. Um tecto que ainda
 * não existe não é motivo para a app deixar de escrever.
 */
export async function marcarConsumo(
  supabase: SupabaseClient,
  email: string | null | undefined,
  acao: Acao,
  /** Quantas vezes se faz isto. Um lote de dez carrosséis são dez, não um. */
  quantas = 1,
): Promise<void> {
  const acesso = await acessoDe(supabase, email);
  if (acesso?.papel === 'admin') return;

  const creditos = custo(acao, quantas);

  const { data, error } = await supabase.rpc('marcar_consumo', {
    acao,
    tecto: TECTO_CREDITOS,
    quantos: creditos,
  });

  if (error) return; // migração por correr, ou a base em baixo: não trava

  const linha = Array.isArray(data) ? data[0] : data;
  if (linha && linha.coube === false) {
    const restam = Math.max(0, TECTO_CREDITOS - Number(linha.total ?? 0));
    throw new Error(
      restam > 0
        ? `Isto custa ${creditos} crédito${creditos === 1 ? '' : 's'} e só te ${
            restam === 1 ? 'resta 1' : `restam ${restam}`
          } este mês. O contador volta a zero no dia 1.`
        : `Chegaste aos ${TECTO_CREDITOS} créditos deste mês. O contador volta a zero no dia 1. ` +
          'A Fábrica de carrosséis, o Editor e a Biblioteca continuam a funcionar — esses não gastam créditos.',
    );
  }
}
