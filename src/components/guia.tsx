'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle, X } from 'lucide-react';
import { guiaDe } from '@/lib/guias';

/**
 * O guia da página, por baixo do título.
 *
 * Aparece aberto da primeira vez e fica fechado depois de o dispensares — mas
 * nunca desaparece de vez: fica uma linha para o voltares a abrir no dia em
 * que precisares.
 */
export function GuiaDaPagina() {
  const caminho = usePathname();
  const guia = guiaDe(caminho);
  const chave = `guia:${caminho.replace(/\/[0-9a-f-]{20,}$/i, '/')}`;

  const [aberto, setAberto] = useState(false);
  const [lido, setLido] = useState(true);

  useEffect(() => {
    const jaViu = window.localStorage.getItem(chave) === 'sim';
    setLido(jaViu);
    setAberto(!jaViu);
  }, [chave]);

  if (!guia) return null;

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-ink"
      >
        <HelpCircle className="h-3.5 w-3.5" /> {guia.titulo.toLowerCase()}
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-[1.25rem] border border-sand bg-creme/70 p-5">
      <div className="mb-2.5 flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-muted" />
        <p className="text-sm font-semibold">{guia.titulo}</p>
        <button
          onClick={() => {
            window.localStorage.setItem(chave, 'sim');
            setLido(true);
            setAberto(false);
          }}
          className="ml-auto rounded-full p-1.5 text-muted transition hover:bg-superficie hover:text-ink"
          title={lido ? 'Fechar' : 'Já percebi'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ol className="space-y-1.5">
        {guia.passos.map((p, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-superficie text-[11px] font-semibold text-muted">
              {i + 1}
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
