import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';

export const runtime = 'nodejs';

/**
 * Este email tem lugar na app?
 * Serve à troca de email nas Definições: sem isto, trocar para um endereço
 * de fora deixava a pessoa fechada do lado de lá da porta.
 */
export const GET = withUser(async ({ supabase, request }) => {
  const email = new URL(request.url).searchParams.get('email') ?? '';
  const acesso = await acessoDe(supabase, email);
  return ok({ existe: Boolean(acesso) });
});
