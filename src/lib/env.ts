/**
 * Verificações de ambiente.
 * Servem para a app explicar o que falta em vez de rebentar no arranque.
 */

/** As duas variáveis sem as quais nem o login funciona. */
export function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export interface EnvCheck {
  key: string;
  ok: boolean;
  required: boolean;
  what: string;
}

/** Estado de cada variável, para a página /configurar. Só corre no servidor. */
export function envChecks(): EnvCheck[] {
  const set = (v?: string) => Boolean(v?.trim());
  return [
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      ok: set(process.env.NEXT_PUBLIC_SUPABASE_URL),
      required: true,
      what: 'Endereço do projeto Supabase (Project Settings → API).',
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      ok: set(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      required: true,
      what: 'Chave pública (anon) do mesmo ecrã.',
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      ok: set(process.env.SUPABASE_SERVICE_ROLE_KEY),
      required: true,
      what: 'Chave service-role. É com ela que a fila trabalha sem sessão.',
    },
    {
      key: 'TOKEN_ENCRYPTION_KEY',
      ok: set(process.env.TOKEN_ENCRYPTION_KEY),
      required: true,
      what: 'Cifra os segredos guardados na base de dados. Já foi gerada.',
    },
    {
      key: 'OPENAI_API_KEY',
      ok: set(process.env.OPENAI_API_KEY),
      required: false,
      what: 'Opcional aqui — podes colar a chave em Definições, dentro da app.',
    },
    {
      key: 'GOOGLE_CLIENT_ID',
      ok: set(process.env.GOOGLE_CLIENT_ID),
      required: false,
      what: 'Opcional. Só para importar ficheiros do Google Drive.',
    },
    {
      key: 'CANVA_CLIENT_ID',
      ok: set(process.env.CANVA_CLIENT_ID),
      required: false,
      what: 'Opcional. Só serve com Canva Enterprise.',
    },
  ];
}
