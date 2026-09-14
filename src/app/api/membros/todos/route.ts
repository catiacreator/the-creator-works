import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { carregarMatriz } from '@/lib/papeis-servidor';
import { pode } from '@/lib/papeis';
import { erroDaBaseDeDados } from '@/lib/migracoes';

export const runtime = 'nodejs';

/**
 * Dar prazo a toda a gente de uma vez.
 *
 * Existe por causa de um dia mau: a entrada pelo CarouselSnap ainda não abre,
 * e os alunos — que pagaram — estão a bater numa porta fechada. O prazo de
 * cada um edita-se na lista, um a um; com trinta pessoas isso é meia hora de
 * cliques, e meia hora é muito tempo quando há gente à espera.
 *
 * Três cuidados, e nenhum é acessório:
 *
 * 1. **Só mexe em quem está ativo.** Quem a Cátia suspendeu de propósito
 *    continua suspenso. Um botão que ressuscita contas que alguém fechou à
 *    mão é um botão que desfaz decisões sem as mostrar.
 *
 * 2. **Não muda papéis nem permissões.** Prazo é prazo. Quem tinha o papel de
 *    aluno continua aluno — o que cada papel abre decide-se na tabela de
 *    permissões, que é outro sítio e outra decisão.
 *
 * 3. **Corre com a sessão dela.** Não precisa da chave de serviço: as
 *    políticas da tabela já deixam a admin mexer em todas as linhas. É de
 *    propósito — este caminho tem de funcionar exactamente nos dias em que a
 *    chave de serviço não está a funcionar.
 */

/** Quanto tempo se pode dar de uma vez, para um engano não valer dez anos. */
const MAXIMO_DIAS = 365;

export const POST = withUser(async ({ user, supabase, request }) => {
  const acesso = await acessoDe(supabase, user.email);
  const matriz = await carregarMatriz(supabase);
  if (!pode(acesso?.papel, 'gerir-pessoas', matriz)) {
    throw new Error('Só a admin dá acesso a toda a gente.');
  }

  const corpo = (await request.json().catch(() => ({}))) as {
    /** dias a contar de hoje; `null` tira o prazo e deixa o acesso sem fim */
    dias?: number | null;
  };

  let ate: string | null = null;
  if (corpo.dias !== null && corpo.dias !== undefined) {
    const dias = Math.floor(Number(corpo.dias));
    if (!Number.isFinite(dias) || dias < 1) throw new Error('Escolhe pelo menos um dia.');
    if (dias > MAXIMO_DIAS) throw new Error(`No máximo ${MAXIMO_DIAS} dias de uma vez.`);
    ate = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from('membros')
    .update({ acesso_ate: ate })
    .eq('ativo', true)
    .select('email');

  if (error) throw erroDaBaseDeDados(error);

  const quantos = data?.length ?? 0;
  console.log(`[acesso] ${user.email} deu prazo ${ate ?? 'sem fim'} a ${quantos} pessoas`);

  return ok({ quantos, ate });
});
