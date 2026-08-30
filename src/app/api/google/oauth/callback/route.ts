import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, getUser } from '@/lib/supabase/server';
import { exchangeCode } from '@/lib/google';
import { saveIntegration } from '@/lib/pipeline';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL!;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL('/login', base));

  const jar = cookies();
  if (!code || !state || state !== jar.get('google_state')?.value) {
    return NextResponse.redirect(new URL('/definicoes?erro=google-state', base));
  }

  try {
    const tokens = await exchangeCode(code);
    await saveIntegration(
      createClient() as unknown as SupabaseClient,
      user.id,
      'google',
      tokens,
    );
  } catch (err) {
    const message = encodeURIComponent(err instanceof Error ? err.message : 'erro');
    return NextResponse.redirect(new URL(`/definicoes?erro=${message}`, base));
  } finally {
    jar.delete('google_state');
  }

  return NextResponse.redirect(new URL('/fontes?ligado=google', base));
}
