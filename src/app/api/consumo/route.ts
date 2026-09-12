import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { TECTO_CREDITOS } from '@/lib/creditos';

export const runtime = 'nodejs';

/**
 * Quantos créditos já foram gastos este mês.
 *
 * Serve para se ver o gasto antes de bater na parede. Não marca nada — é só
 * uma leitura.
 */
export const GET = withUser(async ({ user, supabase }) => {
  const acesso = await acessoDe(supabase, user.email);
  const semTecto = acesso?.papel === 'admin';

  const { data, error } = await supabase.rpc('consumo_do_mes');
  if (error) {
    // migração por correr: melhor não mostrar número nenhum do que um errado
    return ok({ disponivel: false, tecto: TECTO_CREDITOS, semTecto });
  }

  const linha = Array.isArray(data) ? data[0] : data;
  return ok({
    disponivel: true,
    total: Number(linha?.total ?? 0),
    porAcao: (linha?.por_acao ?? {}) as Record<string, number>,
    tecto: TECTO_CREDITOS,
    semTecto,
  });
});
