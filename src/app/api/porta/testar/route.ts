import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { acessoDe } from '@/lib/acesso';
import { escreverPassagem } from '@/lib/passagem';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Experimentar a porta sem o CarouselSnap.
 *
 * A ligação tem dois lados, e quando não funciona a primeira pergunta é
 * sempre a mesma: é o meu lado ou o dele? Sem maneira de responder, discute-se
 * às cegas — e a Cátia fica dependente de alguém do outro lado para saber se
 * o trabalho deste está feito.
 *
 * Isto escreve um bilhete a valer, com o segredo que está no ambiente, e
 * atira-a para a porta com ele. Se entrar, este lado está pronto e o que falta
 * é o botão do CarouselSnap. Se cair no /assinar, o problema é cá — e os
 * registos dizem qual.
 *
 * Porque é que isto não é uma porta das traseiras: o bilhete é escrito para o
 * email da sessão que está a pedir, e só se ela for admin. Não dá para pedir
 * um bilhete para outra pessoa, e quem o pede já está lá dentro — não ganha
 * acesso nenhum que não tivesse.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  const user = await getUser();
  if (!user?.email) return NextResponse.redirect(`${origin}/login`);

  const acesso = await acessoDe(createClient() as unknown as SupabaseClient, user.email);
  if (acesso?.papel !== 'admin') {
    return NextResponse.json({ error: 'Só a admin experimenta a porta.' }, { status: 403 });
  }

  const segredo = process.env.PASSAGEM_SEGREDO?.trim();
  if (!segredo) {
    return NextResponse.json(
      {
        error:
          'Falta o PASSAGEM_SEGREDO na Vercel. Sem ele não há bilhete para escrever nem para conferir.',
      },
      { status: 503 },
    );
  }

  const bilhete = escreverPassagem(user.email, segredo, {
    nome: (user.user_metadata?.full_name as string | undefined) ?? undefined,
    // o id do CarouselSnap não se inventa: um id falso ficava preso à linha
    // dela e, no dia em que o verdadeiro chegasse, era outra pessoa
  });

  return NextResponse.redirect(`${origin}/entrar?t=${encodeURIComponent(bilhete)}&para=/`);
}
