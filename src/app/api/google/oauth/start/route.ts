import { NextResponse } from 'next/server';
import { enderecoDaApp } from '@/lib/caminho';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getUser } from '@/lib/supabase/server';
import { authorizeUrl } from '@/lib/google';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const base = enderecoDaApp(request);
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(`${base}/definicoes?erro=google-nao-configurado`);
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
