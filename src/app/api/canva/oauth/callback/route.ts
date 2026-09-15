import { NextResponse } from 'next/server';
import { enderecoDaApp } from '@/lib/caminho';
import { cookies } from 'next/headers';
import { createClient, getUser } from '@/lib/supabase/server';
import { exchangeCode } from '@/lib/canva';
import { saveIntegration } from '@/lib/pipeline';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const base = enderecoDaApp(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const user = await getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  const jar = cookies();
  const verifier = jar.get('canva_verifier')?.value;
  const expectedState = jar.get('canva_state')?.value;

  if (!code || !verifier || !state || state !== expectedState) {
    return NextResponse.redirect(`${base}/definicoes?erro=canva-state`);
  }

  try {
    const tokens = await exchangeCode(code, verifier);
    await saveIntegration(
      createClient() as unknown as SupabaseClient,
      user.id,
      'canva',
      tokens,
    );
  } catch (err) {
    const message = encodeURIComponent(err instanceof Error ? err.message : 'erro');
    return NextResponse.redirect(`${base}/definicoes?erro=${message}`);
  } finally {
    jar.delete('canva_verifier');
    jar.delete('canva_state');
  }

  return NextResponse.redirect(`${base}/definicoes?ligado=canva`);
}
