/**
 * Quem pode entrar.
 *
 * A app é privada: é dela. Qualquer pessoa pode pedir um link mágico ao
 * Supabase, por isso a porta fecha-se aqui — no middleware, no callback do
 * login e no ecrã de entrada. Quem não estiver nesta lista não passa, mesmo
 * que consiga uma sessão.
 *
 * Para acrescentar alguém: EMAILS_COM_ACESSO no ambiente, separados por
 * vírgulas.
 */
const DONA = 'catiacreator@gmail.com';

export function emailsComAcesso(): string[] {
  const doAmbiente = (process.env.EMAILS_COM_ACESSO ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const lista = new Set([DONA, ...doAmbiente]);
  // a conta de construção só existe fora de produção
  if (process.env.NODE_ENV !== 'production') {
    lista.add((process.env.DEV_LOGIN_EMAIL ?? 'dev@carrossellab.dev').toLowerCase());
  }
  return [...lista];
}

export function podeEntrar(email?: string | null): boolean {
  if (!email) return false;
  return emailsComAcesso().includes(email.trim().toLowerCase());
}

/** O que se mostra a quem bate à porta sem ser convidado. */
export const RECADO_SEM_ACESSO = 'Esta app é privada. Esta conta não tem acesso.';
