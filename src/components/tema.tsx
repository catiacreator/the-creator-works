'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import clsx from 'clsx';

/**
 * O botão que troca entre claro e escuro.
 *
 * A decisão fica guardada no computador dela e é aplicada antes da página
 * desenhar (ver o script no layout) — senão via-se o ecrã branco a piscar
 * antes de ficar escuro.
 */
export function BotaoDeTema({ fechada }: { fechada?: boolean }) {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains('dark'));
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle('dark', novo);
    try {
      window.localStorage.setItem('tema', novo ? 'escuro' : 'claro');
    } catch {
      /* sem espaço para guardar — fica só nesta visita */
    }
  }

  return (
    <button
      onClick={alternar}
      title={escuro ? 'Passar a claro' : 'Passar a escuro'}
      className={clsx(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted transition hover:bg-creme hover:text-ink',
        fechada ? 'justify-center px-0' : 'w-full',
      )}
    >
      {escuro ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      {!fechada && (escuro ? 'Modo claro' : 'Modo escuro')}
    </button>
  );
}

/**
 * Lido antes de tudo o resto, dentro do <head>: põe a classe no <html> ainda
 * antes de haver ecrã. Sem isto, quem usa o modo escuro via um clarão branco
 * a cada página que abrisse.
 */
export const guiaoDoTema = `
try {
  var t = localStorage.getItem('tema');
  var escuro = t === 'escuro' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (escuro) document.documentElement.classList.add('dark');
} catch (e) {}
`.trim();
