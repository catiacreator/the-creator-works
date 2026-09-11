import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfigured } from '@/lib/env';
import { RECADO_CADUCADO, RECADO_SEM_ACESSO, estadoDoAcesso } from '@/lib/acesso';

/** Mantém a sessão do Supabase fresca em cada pedido. */
export async function middleware(request: NextRequest) {
  // Sem Supabase ligado não há sessão possível: manda tudo para /configurar
  // em vez de rebentar em cada pedido.
  if (!supabaseConfigured()) {
    const { pathname } = request.nextUrl;
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Supabase por configurar. Abre /configurar.' },
        { status: 503 },
      );
    }
    if (pathname === '/configurar') return NextResponse.next();
    return NextResponse.redirect(new URL('/configurar', request.url));
  }

  // o layout precisa de saber a página para decidir se deixa passar
  request.headers.set('x-caminho', request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: CookieOptions) => {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A app é privada. Sessão de quem não tem lugar na tabela `membros`
  // fecha-se aqui, antes de chegar a qualquer página ou API.
  if (user) {
    const estado = await estadoDoAcesso(supabase, user.email);
    const { pathname } = request.nextUrl;

    // Quem deixou de pagar não é posta na rua: a sessão fica de pé e ela vai
    // parar à página de renovação. Fechá-la à chave obrigava-a a entrar de
    // novo para pagar, e quem está a pagar merece menos trabalho do que isso.
    if ('motivo' in estado && estado.motivo === 'caducada') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: RECADO_CADUCADO, caducado: true }, { status: 402 });
      }
      // o webhook do Stripe e a saída da conta continuam a passar
      if (pathname === '/renovar' || pathname === '/login') return response;
      return NextResponse.redirect(new URL('/renovar', request.url));
    }

    if ('motivo' in estado) {
      await supabase.auth.signOut();
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: RECADO_SEM_ACESSO }, { status: 403 });
      }
      if (pathname === '/login') return response;
      return NextResponse.redirect(
        new URL(`/login?erro=${encodeURIComponent(RECADO_SEM_ACESSO)}`, request.url),
      );
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
