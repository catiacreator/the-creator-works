'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dev = process.env.NODE_ENV !== 'production';

  async function devLogin() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/dev/login', { method: 'POST' });
    const data = await res.json();
    setBusy(false);
    if (data.error) return setError(data.error);
    window.location.href = '/';
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">
          The Creator <span className="text-rosa">Works</span>
        </h1>
        <p className="mb-8 text-sm text-muted">
          Carrosséis de Instagram em massa, no teu template.
        </p>

        {sent ? (
          <div className="card text-sm">
            Enviámos um link para <strong>{email}</strong>. Abre-o neste dispositivo para entrar.
          </div>
        ) : (
          <form onSubmit={send} className="card space-y-4">
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@exemplo.com"
              />
            </div>
            {error && <p className="text-sm text-rose-700">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'A enviar…' : 'Entrar com link mágico'}
            </button>
          </form>
        )}

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
