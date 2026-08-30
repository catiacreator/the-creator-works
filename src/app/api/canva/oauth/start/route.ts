import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getUser } from '@/lib/supabase/server';
import { authorizeUrl, makePkce } from '@/lib/canva';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!));

  if (!process.env.CANVA_CLIENT_ID) {
    return NextResponse.redirect(
      new URL('/definicoes?erro=canva-nao-configurado', process.env.NEXT_PUBLIC_APP_URL!),
    );
  }

  const { verifier, challenge } = makePkce();
  const state = crypto.randomBytes(16).toString('hex');

  const jar = cookies();
  const opts = { httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 600, path: '/' };
  jar.set('canva_verifier', verifier, opts);
  jar.set('canva_state', state, opts);

  return NextResponse.redirect(authorizeUrl(challenge, state));
}
