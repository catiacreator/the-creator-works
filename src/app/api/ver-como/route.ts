import { cookies } from 'next/headers';
import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { carregarMatriz } from '@/lib/papeis-servidor';
import { pode, type Papel } from '@/lib/papeis';

export const runtime = 'nodejs';

/** Uma rota só pode exportar handlers — o nome do cookie fica aqui dentro. */
const COOKIE_VER_COMO = 'ver-como';
/** Este não é httpOnly de propósito: a página do briefing precisa de o ler. */
const COOKIE_PRIMEIRO_DIA = 'primeiro-dia';

/**
 * Ver a app pelos olhos de outro papel.
 *
 * Guarda-se num cookie, não na conta: é uma lente, não uma mudança. Só quem
 * pode gerir pessoas a consegue pôr, e nunca dá mais do que já se tem — a
 * lente serve para ver menos, não mais.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const acesso = await acessoDe(supabase, user.email);
  const matriz = await carregarMatriz(supabase);
  if (!pode(acesso?.papel, 'gerir-pessoas', matriz)) {
    throw new Error('Só a admin pode ver a app pelos olhos de outro papel.');
  }

  const { papel, primeiroDia } = (await request.json()) as {
    papel?: Papel | null;
    primeiroDia?: boolean;
  };
  const loja = cookies();

  // ver a app como quem acabou de se registar: a porta do Sobre mim fechada,
  // o menu apagado, e o aviso de boas-vindas. Não toca no briefing dela.
  if (primeiroDia !== undefined) {
    if (primeiroDia) {
      loja.set(COOKIE_PRIMEIRO_DIA, '1', { sameSite: 'lax', path: '/', maxAge: 60 * 60 });
    } else {
      loja.delete(COOKIE_PRIMEIRO_DIA);
    }
    return ok({ primeiro_dia: Boolean(primeiroDia) });
  }

  if (!papel) {
    loja.delete(COOKIE_VER_COMO);
    return ok({ ver_como: null });
  }

  if (!['admin', 'suporte', 'aluno'].includes(papel)) throw new Error('Papel desconhecido.');

  loja.set(COOKIE_VER_COMO, papel, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4, // quatro horas chegam para espreitar
  });
  return ok({ ver_como: papel });
});
