'use client';

import { Fragment } from 'react';

/**
 * O pouco de markdown que a Cát.IA usa: títulos, **negrito**, listas.
 * Não vale a pena uma biblioteca inteira para isto — e assim o resultado
 * fica com a tipografia da app em vez de uma folha de estilos estranha.
 */
export function TextoRico({ texto }: { texto: string }) {
  const linhas = texto.split('\n');

  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {linhas.map((linha, i) => {
        const t = linha.trim();
        if (!t) return null;

        // um título de bloco: emoji + MAIÚSCULAS
        if (/^[\p{Emoji}\p{Extended_Pictographic}]/u.test(t) && t === t.toUpperCase()) {
          return (
            <h2
              key={i}
              className="border-b border-sand pb-2 pt-5 text-[13px] font-semibold uppercase tracking-wider text-muted first:pt-0"
            >
              {t}
            </h2>
          );
        }

        // ## Título
        if (t.startsWith('#')) {
          return (
            <h3 key={i} className="pt-3 text-lg font-semibold">
              {t.replace(/^#+\s*/, '')}
            </h3>
          );
        }

        // - item  ou  1. item
        const lista = t.match(/^([-•*]|\d+[.)])\s+(.*)$/);
        if (lista) {
          return (
            <p key={i} className="flex gap-2.5 pl-1">
              <span className="mt-[2px] shrink-0 text-rosa">
                {/^\d/.test(lista[1]) ? lista[1] : '·'}
              </span>
              <span>{comNegrito(lista[2])}</span>
            </p>
          );
        }

        return <p key={i}>{comNegrito(t)}</p>;
      })}
    </div>
  );
}

/** **isto** fica a negrito. */
function comNegrito(texto: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? (
      <strong key={i} className="font-semibold text-ink">
        {parte.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{parte}</Fragment>
    ),
  );
}
