import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

/**
 * A saída.
 *
 * Isto faltava, e a falta era uma ratoeira.
 *
 * O botão de sair vive dentro das Definições — uma página da app. Quando a
 * sessão aberta é de alguém a quem o middleware não reconhece lugar, ele
 * fecha-a e manda a pessoa para o /login. Ela entra outra vez, volta a ser
 * mandada para fora, e nunca chega às Definições para carregar no botão que
 * a livrava disto. O único caminho de saída estava do lado de dentro da
 * porta que não abre.
 *
 * Esta rota é a saída pelo lado de fora. É uma PORTA (está em `portas.ts`),
 * por isso o middleware deixa-a passar sempre, sem conferir lugar nenhum —
 * tem de ser assim, porque quem precisa dela é precisamente quem não tem
 * lugar.
 *
 * Não pede nada e não pode fazer mal: o pior que faz é fechar uma sessão,
 * que é a coisa que quem aqui chega quer.
 *
 * Limpa por duas vias, de propósito. O `signOut` é o caminho certo e fala
 * com o Supabase; mas se ele não responder — e há dias em que não responde —
 * os cookies ficavam lá e a ratoeira continuava fechada. Por isso, a seguir,
 * apagam-se à mão todos os cookies do Supabase que vieram no pedido.
 */
export async function GET(request: NextRequest) {
  // o nextUrl sabe do basePath: o /login continua debaixo do /creator-works
  const destino = request.nextUrl.clone();
  destino.pathname = '/login';
  destino.search = '?saiu=1';
  const paraOLogin = NextResponse.redirect(destino);

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            paraOLogin.cookies.set({ name, value, ...options });
          },
          remove: (name: string, options: CookieOptions) => {
            paraOLogin.cookies.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      },
    );
    await supabase.auth.signOut();
  } catch {
    // o Supabase não respondeu. Não é motivo para deixar a pessoa presa:
    // os cookies apagam-se a seguir de qualquer maneira.
  }

  // a rede de segurança: fora todos os cookies da sessão, respondesse o
  // Supabase ou não
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      paraOLogin.cookies.set({ name: cookie.name, value: '', path: '/', maxAge: 0 });
    }
  }

  return paraOLogin;
}
