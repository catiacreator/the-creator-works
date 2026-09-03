import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { carregarMatriz } from '@/lib/papeis-servidor';
import { INTOCAVEIS, TODAS_AS_PERMISSOES, pode, type Papel, type Permissao } from '@/lib/papeis';

export const runtime = 'nodejs';

/** A tabela dos papéis, para quem já entrou. */
export const GET = withUser(async ({ supabase }) => {
  return ok({ matriz: await carregarMatriz(supabase) });
});

/**
 * Mudar o que um papel pode fazer.
 *
 * Duas coisas não se deixam mudar, e é de propósito: a admin não pode perder
 * o acesso à lista de pessoas nem o direito de mexer nela — se pudesse,
 * bastava um clique errado para ninguém voltar a abrir esta página.
 */
export const PATCH = withUser(async ({ user, supabase, request }) => {
  const acesso = await acessoDe(supabase, user.email);
  const matriz = await carregarMatriz(supabase);
  if (!pode(acesso?.papel, 'gerir-pessoas', matriz)) {
    throw new Error('Só a admin muda o que cada papel faz.');
  }

  const { papel, permissoes } = (await request.json()) as {
    papel?: Papel;
    permissoes?: Permissao[];
  };
  if (!papel) throw new Error('Falta dizer que papel.');

  const limpas = (permissoes ?? []).filter((p) => TODAS_AS_PERMISSOES.includes(p));
  const finais = [...new Set([...limpas, ...INTOCAVEIS[papel]])];

  const { data, error } = await supabase
    .from('papeis')
    .update({ permissoes: finais, atualizado: new Date().toISOString() })
    .eq('id', papel)
    .select('id, permissoes');

  if (error) {
    throw new Error(
      /row-level security/i.test(error.message)
        ? 'A base de dados não te reconhece como admin nesta conta. Entra com o email da dona da app.'
        : error.message,
    );
  }

  // Sem isto, a mudança parecia guardada e não estava: quando as políticas
  // recusam uma alteração, o Postgres não dá erro — simplesmente não altera
  // linha nenhuma. O ecrã mostrava o novo estado e a base de dados ficava com
  // o antigo, e só se dava por isso na sessão seguinte.
  if (!data?.length) {
    throw new Error(
      'A base de dados não deixou guardar: esta conta não é reconhecida como admin. ' +
        'Entra com o email da dona da app.',
    );
  }

  return ok({ permissoes: data[0].permissoes });
});
