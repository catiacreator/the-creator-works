/**
 * De que migração veio cada peça da base de dados.
 *
 * Quando uma migração ainda não correu, o Supabase responde com uma frase
 * que não serve a ninguém:
 *
 *     Could not find the function public.guardar_chave_admin in the schema cache
 *
 * Está certa e é inútil. Não diz o que fazer, não diz onde, e está em inglês
 * — e quem a lê é a Cátia, no meio de outra coisa qualquer. O que ela precisa
 * de saber é uma frase: falta correr o ficheiro X no SQL Editor.
 *
 * A app sabe isso. Sabe que `guardar_chave_admin` nasceu na 027, porque foi
 * ela que a escreveu. Este ficheiro é essa memória, escrita num sítio só —
 * para que uma migração por correr deixe de ser um erro e passe a ser uma
 * instrução.
 */

/** O que cada migração trouxe, para se saber a quem pertence uma peça em falta. */
const DE_ONDE: Record<string, string> = {
  // 022 — a conta dos créditos
  marcar_consumo: '022_consumos.sql',
  consumo_do_mes: '022_consumos.sql',

  // 023 — o Stripe
  marcar_stripe: '023_stripe.sql',
  suspender_por_compra: '023_stripe.sql',

  // 024 — a porta do CarouselSnap
  gastar_passagem: '024_carouselsnap.sql',
  limpar_passagens: '024_carouselsnap.sql',
  passagens: '024_carouselsnap.sql',

  // 025 — o Financeiro
  consumo_de_todos: '025_financeiro.sql',

  // 026 — a pessoa identificada por id
  ver_passagem: '026_identidade.sql',
  renomear_membro: '026_identidade.sql',
  ligar_passagem: '026_identidade.sql',

  // 027 — a porta de serviço da admin
  guardar_chave_admin: '027_porta_admin.sql',
  apagar_chave_admin: '027_porta_admin.sql',
  ver_chave_admin: '027_porta_admin.sql',
  chaves_da_porta: '027_porta_admin.sql',
  porta_admin_abrir: '027_porta_admin.sql',
  porta_admin_travada: '027_porta_admin.sql',
  porta_admin_registar: '027_porta_admin.sql',
  chaves_admin: '027_porta_admin.sql',
};

/**
 * O erro do Supabase, dito de maneira a poder ser resolvido.
 *
 * Devolve a frase em português quando o erro é uma peça que não existe, e
 * `null` quando é outra coisa qualquer — porque inventar uma explicação para
 * um erro que não se percebeu é pior do que mostrar o erro cru.
 */
export function migracaoEmFalta(erro: unknown): string | null {
  const recado =
    typeof erro === 'string'
      ? erro
      : ((erro as { message?: string } | null)?.message ?? '');
  if (!recado) return null;

  // o PostgREST quando não encontra a função (PGRST202), e o Postgres quando
  // não encontra a tabela (42P01) ou a coluna (42703)
  const naoExiste =
    /could not find the (function|table|column)/i.test(recado) ||
    /does not exist/i.test(recado) ||
    /schema cache/i.test(recado);
  if (!naoExiste) return null;

  // o nome vem escrito lá dentro, com ou sem o `public.` à frente
  for (const [peca, ficheiro] of Object.entries(DE_ONDE)) {
    if (recado.includes(peca)) {
      return (
        `Falta correr a migração ${ficheiro} no Supabase. ` +
        `Abre o SQL Editor do projeto do Creator Works e cola o conteúdo desse ficheiro. ` +
        `(O que faltou foi ${peca}.)`
      );
    }
  }

  return (
    'A base de dados não tem uma peça que esta página precisa — é uma migração por correr. ' +
    `O Supabase disse: ${recado}`
  );
}

/**
 * Um erro de base de dados, pronto a mostrar.
 *
 * Usa-se no lugar de `throw new Error(error.message)`: quando o erro é uma
 * migração em falta, sai a instrução; quando não é, sai o que o Supabase
 * disse, sem enfeite.
 */
export function erroDaBaseDeDados(erro: unknown): Error {
  const traduzido = migracaoEmFalta(erro);
  if (traduzido) return new Error(traduzido);
  const recado =
    typeof erro === 'string' ? erro : ((erro as { message?: string } | null)?.message ?? '');
  return new Error(recado || 'A base de dados não respondeu.');
}
