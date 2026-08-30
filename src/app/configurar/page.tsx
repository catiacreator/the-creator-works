import Link from 'next/link';
import { envChecks, supabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Página de arranque. Aparece enquanto faltarem variáveis de ambiente,
 * em vez de a app rebentar sem explicar porquê.
 */
export default function ConfigurarPage() {
  const checks = envChecks();
  const pronto = supabaseConfigured() && checks.every((c) => !c.required || c.ok);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">
        The Creator <span className="text-rosa">Works</span>
      </h1>
      <p className="mb-8 text-sm text-muted">
        {pronto
          ? 'Está tudo ligado. Podes entrar.'
          : 'Falta ligar a base de dados. São cinco minutos, uma só vez.'}
      </p>

      {pronto && (
        <Link href="/login" className="btn-primary mb-8 inline-flex">
          Entrar
        </Link>
      )}

      <div className="card mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Variáveis em <code>.env.local</code>
        </h2>
        <ul className="space-y-3">
          {checks.map((c) => (
            <li key={c.key} className="flex gap-3 text-sm">
              <span
                className={`pill mt-0.5 shrink-0 ${
                  c.ok
                    ? 'bg-ink text-white'
                    : c.required
                      ? 'bg-rosa text-white'
                      : 'bg-creme text-muted'
                }`}
              >
                {c.ok ? 'ok' : c.required ? 'falta' : 'opcional'}
              </span>
              <span>
                <code className="text-[13px]">{c.key}</code>
                <span className="block text-muted">{c.what}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card space-y-4 text-sm leading-relaxed">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Como ligar o Supabase
        </h2>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            Cria um projeto em{' '}
            <a
              className="underline"
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              supabase.com/dashboard
            </a>
            .
          </li>
          <li>
            <strong>SQL Editor</strong> → cola o conteúdo de{' '}
            <code>supabase/schema.sql</code> e corre. Cria as tabelas, as regras
            de acesso e o bucket das imagens.
          </li>
          <li>
            <strong>Authentication → Providers → Email</strong> → liga o{' '}
            <em>Magic Link</em>.
          </li>
          <li>
            <strong>Authentication → URL Configuration</strong> → acrescenta{' '}
            <code>http://localhost:3000/auth/callback</code>.
          </li>
          <li>
            <strong>Project Settings → API</strong> → copia o <em>URL</em>, a
            chave <em>anon</em> e a <em>service_role</em> para as três primeiras
            linhas do <code>.env.local</code>.
          </li>
          <li>Guarda o ficheiro. O servidor recarrega sozinho e esta página deixa de aparecer.</li>
        </ol>
        <p className="text-muted">
          A chave da OpenAI podes deixá-la para depois: cola-a em{' '}
          <strong>Definições</strong>, já dentro da app, onde fica cifrada.
        </p>
      </div>
    </div>
  );
}
