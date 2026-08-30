import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Cliente Supabase para Server Components e Route Handlers (sessão do utilizador). */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* chamado a partir de um Server Component — ignorável */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            /* idem */
          }
        },
      },
    },
  );
}

/** Devolve o utilizador autenticado ou null. */
export async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Igual ao anterior, mas atira 401 nas rotas de API. */
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new Response('Não autenticado', { status: 401 });
  return user;
}
