import { NextResponse } from 'next/server';
import { createClient, getUser } from './supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export type Handler = (ctx: {
  user: User;
  supabase: SupabaseClient;
  request: Request;
  params: Record<string, string>;
}) => Promise<Response>;

/** Envolve um route handler: exige sessão e transforma erros em JSON. */
export function withUser(handler: Handler) {
  return async (request: Request, context?: { params?: Record<string, string> }) => {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    try {
      return await handler({
        user,
        supabase: createClient() as unknown as SupabaseClient,
        request,
        params: context?.params ?? {},
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      console.error('[api]', message);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  };
}

export const ok = (data: unknown = { ok: true }) => NextResponse.json(data);
