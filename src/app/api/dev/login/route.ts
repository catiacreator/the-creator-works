import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const DEV_EMAIL = process.env.DEV_LOGIN_EMAIL || 'dev@carrossellab.dev';
const DEV_PASSWORD = process.env.DEV_LOGIN_PASSWORD || 'carrossel-lab-dev';

/**
 * Entrada de serviço para desenvolvimento.
 * Cria (uma vez) uma conta local e inicia sessão com ela, para não ser preciso
 * o link mágico enquanto se está a construir. Em produção não existe.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Indisponível.' }, { status: 404 });
  }

  const supabase = createClient();

  // 1. tentar entrar — da segunda vez em diante é só isto
  const first = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });
  if (!first.error) return NextResponse.json({ ok: true, email: DEV_EMAIL });

  // 2. não existe: criar. Com a service-role fica confirmada de imediato.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
      email_confirm: true,
    });
    if (error && !/already/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    const { data, error } = await supabase.auth.signUp({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data.session) {
      return NextResponse.json(
        {
          error:
            'Conta de construção criada, mas o Supabase exige confirmação por email. ' +
            'Desliga "Confirm email" em Authentication → Sign In / Providers → Email, ' +
            'ou põe a SUPABASE_SERVICE_ROLE_KEY no .env.local. Depois carrega outra vez.',
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, email: DEV_EMAIL });
  }

  // 3. entrar já com a conta criada
  const second = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });
  if (second.error) {
    return NextResponse.json({ error: second.error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, email: DEV_EMAIL });
}
