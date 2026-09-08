'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [palavra, setPalavra] = useState('');
  const [enviado, setEnviado] = useState<'recuperar' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dev = process.env.NODE_ENV !== 'production';

  // o middleware e o callback mandam para aqui com o motivo no endereço
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const motivo = params.get('erro');
    if (motivo) setError(motivo === '1' ? 'O link expirou ou já foi usado.' : motivo);
    if (params.get('novo') === '1') setRecado('Palavra-passe criada. Entra com ela.');
  }, []);

  async function devLogin() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/dev/login', { method: 'POST' });
    const data = await res.json();
    setBusy(false);
    if (data.error) return setError(data.error);
    window.location.href = '/';
  }

  async function google() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // se der erro fica-se aqui; se não, o browser é redirecionado para o Google
    if (error) {
      setBusy(false);
      setError(error.message);
    }
  }

  /** Entrar com email e palavra-passe. */
  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: palavra });
    setBusy(false);
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email ou palavra-passe errados.'
          : error.message,
      );
      return;
    }
    window.location.href = '/';
  }

  /** Manda o email de recuperação, que aterra na página de definir palavra-passe. */
  async function recuperar() {
    if (!email) return setError('Escreve o teu email primeiro.');
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/palavra-passe`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setEnviado('recuperar');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* eslint-disable @next/next/no-img-element */}
        <img
          src="/the-creator-works.png"
          alt="The Creator Works"
          className="mb-2 h-9 w-auto dark:hidden"
        />
        <img
          src="/the-creator-works-escuro.png"
          alt="The Creator Works"
          className="mb-2 hidden h-9 w-auto dark:block"
        />
        {/* eslint-enable @next/next/no-img-element */}
        <p className="mb-8 text-sm text-muted">
          Carrosséis de Instagram em massa, no teu template.
        </p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="btn-ghost mb-4 flex w-full items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.67 2.84C6.72 7.3 9.14 5.38 12 5.38z" />
          </svg>
          Continuar com Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-sand" /> ou <span className="h-px flex-1 bg-sand" />
        </div>

        {recado && (
          <div className="mb-4 rounded-xl border border-sand bg-creme/60 px-4 py-3 text-sm">
            {recado}
          </div>
        )}

        {enviado === 'recuperar' && (
          <div className="card text-sm">
            Enviámos um email para <strong>{email}</strong>. O link abre a página onde escolhes a
            palavra-passe nova.
          </div>
        )}

        {!enviado && (
          <form onSubmit={entrar} className="card space-y-4">
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@exemplo.com"
              />
            </div>

            <div>
              <label className="label" htmlFor="palavra">
                Palavra-passe
              </label>
              <input
                id="palavra"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={palavra}
                onChange={(e) => setPalavra(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-rose-700">{error}</p>}

            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Um momento…' : 'Entrar'}
            </button>

            <div className="text-center text-xs text-muted">
              <button
                type="button"
                className="underline-offset-2 hover:text-ink hover:underline"
                onClick={recuperar}
              >
                Esqueci-me da palavra-passe
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Esta app é privada.
        </p>

        {dev && (
          <div className="mt-6 border-t border-sand pt-6">
            <button className="btn-ghost w-full" onClick={devLogin} disabled={busy}>
              Entrar em modo de construção
            </button>
            <p className="mt-2 text-xs text-muted">
              Só existe em desenvolvimento. Conta local, sem email nenhum.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
