'use client';

import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';

/**
 * A página onde se escreve o código.
 *
 * De propósito sem nada: sem logótipo, sem explicação, sem link para lado
 * nenhum. Uma página que diz «entrada de administração do The Creator Works»
 * está a contar a quem lá chega por engano o que vale a pena tentar.
 *
 * O erro que se mostra é sempre o que o servidor mandar, e o servidor manda
 * sempre a mesma frase. Não há aqui lógica nenhuma a decidir o que dizer:
 * decidir do lado do browser era decidir com informação que o browser não
 * devia ter.
 */
export function Porta() {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aEntrar, setAEntrar] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim() || aEntrar) return;

    setAEntrar(true);
    setErro(null);

    try {
      const r = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo.trim() }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; para?: string; erro?: string };

      if (d.ok) {
        // recarrega a página inteira em vez de navegar por dentro: a sessão
        // acabou de nascer nos cookies e o servidor tem de a ver de novo
        window.location.href = d.para ?? '/';
        return;
      }

      setErro(d.erro ?? 'O código não serve.');
    } catch {
      setErro('Não deu para falar com o servidor. Tenta outra vez.');
    }

    setAEntrar(false);
    setCodigo('');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <div className="card">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-creme">
          <KeyRound className="h-5 w-5 text-muted" />
        </span>

        <h1 className="mb-6 text-xl font-semibold">Entrada</h1>

        <form onSubmit={entrar}>
          <input
            type="password"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Código"
            autoComplete="off"
            autoFocus
            spellCheck={false}
            className="input mb-3 w-full font-mono"
          />

          {erro && (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={aEntrar || !codigo.trim()}
            className="btn-primario w-full justify-center"
          >
            {aEntrar && <Loader2 className="h-4 w-4 animate-spin" />}
            {aEntrar ? 'A conferir…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
