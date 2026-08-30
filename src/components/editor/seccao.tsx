'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Uma secção do painel que se dobra.
 * Fechada mostra só o resumo — a cor escolhida, a fonte, o que for.
 * É isso que evita ter o painel inteiro em pé quando só queres mexer numa coisa.
 */
export function Seccao({
  titulo,
  resumo,
  abertaPorDefeito = false,
  children,
}: {
  titulo: string;
  resumo?: ReactNode;
  abertaPorDefeito?: boolean;
  children: ReactNode;
}) {
  const [aberta, setAberta] = useState(abertaPorDefeito);

  return (
    <div className="rounded-xl border border-edLinha">
      <button
        onClick={() => setAberta(!aberta)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-edSuperficie/60"
      >
        <span className="text-xs font-medium text-edSuave">{titulo}</span>
        <span className="ml-auto flex items-center gap-2">
          {!aberta && resumo}
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-edSuave transition-transform ${
              aberta ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>
      {aberta && <div className="border-t border-edLinha p-3">{children}</div>}
    </div>
  );
}
