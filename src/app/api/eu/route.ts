import { cookies } from 'next/headers';
import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { carregarMatriz } from '@/lib/papeis-servidor';
import { pode, TODAS_AS_PERMISSOES, type Papel } from '@/lib/papeis';

export const runtime = 'nodejs';

/**
 * Quem sou eu, e o que posso.
 * As páginas perguntam isto ao servidor em vez de adivinharem pelo email.
 */
export const GET = withUser(async ({ user, supabase }) => {
  const acesso = await acessoDe(supabase, user.email);
  const matriz = await carregarMatriz(supabase);
  const papel = acesso?.papel ?? null;

  // enquanto ela está a ver a app pelos olhos de outro papel, as páginas têm
  // de responder o mesmo que o menu — senão o "ver como" mentia
  const espreitar = cookies().get('ver-como')?.value as Papel | undefined;
  const papelVisto =
    espreitar && espreitar !== papel && pode(papel, 'gerir-pessoas', matriz) ? espreitar : papel;

  return ok({
    email: user.email,
    papel: papelVisto,
    papel_real: papel,
    a_espreitar: papelVisto !== papel,
    permissoes: TODAS_AS_PERMISSOES.filter(
      (p) => pode(papel, p, matriz) && pode(papelVisto, p, matriz),
    ),
  });
});
