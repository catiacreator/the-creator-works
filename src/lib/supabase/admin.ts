import { createClient } from '@supabase/supabase-js';

/**
 * Cliente com service-role. Só para o worker da fila (/api/jobs/run),
 * que corre sem sessão de utilizador. Nunca importar em código de cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
