'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Onde se escolhe a palavra-passe.
 *
 * Chega-se aqui de duas maneiras: pelo link de recuperação do email
 * (/auth/callback?next=/palavra-passe) ou já lá dentro, a partir de
 * Definições. Nos dois casos há sessão, e é a sessão que autoriza a mudança.
 */
export default function PalavraPassePage() {
  const router = useRouter();
  /** veio de um convite: acaba de escolher a palavra-passe e entra de novo */
  const [novo, setNovo] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [nova, setNova] = useState('');
  const [repetida, setRepetida] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    setNovo(new URLSearchParams(window.location.search).get('novo') === '1');
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setACarregar(false);
    })();
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nova.length < 8) return setErro('A palavra-passe tem de ter pelo menos 8 caracteres.');
    if (nova !== repetida) return setErro('As duas não são iguais.');
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: nova });
    setBusy(false);
    if (error) return setErro(error.message);
    setNova('');
    setRepetida('');
    setFeito(true);

    // quem chegou aqui por convite entra agora pela porta da frente, com a
    // palavra-passe que acabou de escolher
    if (novo) {
      await supabase.rpc('convite_aceite');
      await supabase.auth.signOut();
      router.push('/login?novo=1');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Palavra-<span className="text-rosa">passe</span>
        </h1>

        {novo && !feito && (
          <p className="mb-4 text-sm leading-relaxed text-muted">
            Bem-vinda. Falta só escolheres a palavra-passe com que vais entrar.
          </p>
        )}

        {aCarregar ? (
          <p className="text-sm text-muted">Um momento…</p>
        ) : !email ? (
          <div className="card space-y-3 text-sm">
            <p>
              Esta página precisa de sessão aberta. Entra primeiro — com o link mágico ou com o
              Google — e volta aqui.
            </p>
            <Link href="/login" className="btn-primary w-full">
              Ir para o login
            </Link>
          </div>
        ) : feito ? (
          <div className="card space-y-3 text-sm">
            <p>
              Guardada. A partir de agora entras em <strong>{email}</strong> com esta
              palavra-passe.
            </p>
            <Link href="/" className="btn-primary w-full">
              Entrar na app
            </Link>
          </div>
        ) : (
          <form onSubmit={guardar} className="card space-y-4">
            <p className="text-sm text-muted">
              Vais definir a palavra-passe de <strong className="text-ink">{email}</strong>.
            </p>

            <div>
              <label className="label" htmlFor="nova">
                Palavra-passe nova
              </label>
              <input
                id="nova"
                type="password"
                required
                autoComplete="new-password"
                className="input"
                value={nova}
                onChange={(e) => setNova(e.target.value)}
                placeholder="pelo menos 8 caracteres"
              />
            </div>

            <div>
              <label className="label" htmlFor="repetida">
                Outra vez
              </label>
              <input
                id="repetida"
                type="password"
                required
                autoComplete="new-password"
                className="input"
                value={repetida}
                onChange={(e) => setRepetida(e.target.value)}
                placeholder="para não haver enganos"
              />
            </div>

            {erro && <p className="text-sm text-rose-700">{erro}</p>}

            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'A guardar…' : 'Guardar palavra-passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
