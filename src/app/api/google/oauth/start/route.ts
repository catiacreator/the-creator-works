import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getUser } from '@/lib/supabase/server';
import { authorizeUrl } from '@/lib/google';

export const runtime = 'nodejs';

export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL!;
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL('/login', base));

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(new URL('/definicoes?erro=google-nao-configurado', base));
  }

  const state = crypto.randomBytes(16).toString('hex');
  cookies().set('google_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return NextResponse.redirect(authorizeUrl(state));
}
