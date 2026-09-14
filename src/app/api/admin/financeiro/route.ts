import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { TECTO_CREDITOS } from '@/lib/creditos';
import { migracaoEmFalta } from '@/lib/migracoes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * As contas de toda a gente, para o painel de administração.
 *
 * Duas perguntas, e são diferentes:
 *
 *   **quanto foi oferecido** — os créditos que existem, que é o tecto vezes as
 *   pessoas com lugar. Não é o que se gastou: é o que se pôs em cima da mesa.
 *
 *   **quanto foi usado** — as vezes que cada coisa aconteceu, e quanto isso
 *   custou em créditos. As vezes e o custo não são o mesmo número: um
 *   carrossel são 3 créditos e 1 carrossel.
 *
 * Quem guarda a porta é a função na base de dados, que confere o papel antes
 * de devolver seja o que for. Aqui confere-se outra vez, para a API recusar
 * com 403 em vez de rebentar com um erro de SQL.
 */
export const GET = withUser(async ({ user, supabase }) => {
  const acesso = await acessoDe(supabase, user.email);
  if (acesso?.papel !== 'admin') {
    throw new Error('Só a admin vê as contas de todos.');
  }

  // quantas pessoas têm lugar, que é o que multiplica o tecto
  const { count: pessoas } = await supabase
    .from('membros')
    .select('email', { count: 'exact', head: true })
    .eq('ativo', true);

  const { data, error } = await supabase.rpc('consumo_de_todos', { meses: 6 });
  if (error) {
    // a migração ainda não correu: melhor dizer que não há contas do que
    // mostrar zeros que parecem contas. E dizer QUAL falta, que é a
    // diferença entre um aviso e uma instrução
    return ok({
      disponivel: false,
      porque: migracaoEmFalta(error),
      tecto: TECTO_CREDITOS,
      pessoas: pessoas ?? 0,
    });
  }

  interface Linha {
    mes: string;
    pessoas: number;
    total: number;
    por_acao: Record<string, number>;
    vezes_acao: Record<string, number>;
  }

  const meses = ((data ?? []) as Linha[]).map((m) => ({
    mes: m.mes,
    pessoas: Number(m.pessoas ?? 0),
    creditos: Number(m.total ?? 0),
    porAcao: (m.por_acao ?? {}) as Record<string, number>,
    vezesAcao: (m.vezes_acao ?? {}) as Record<string, number>,
  }));

  return ok({
    disponivel: true,
    tecto: TECTO_CREDITOS,
    pessoas: pessoas ?? 0,
    oferecidos: (pessoas ?? 0) * TECTO_CREDITOS,
    meses,
  });
});
