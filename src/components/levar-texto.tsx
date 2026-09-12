'use client';

import { useState } from 'react';
import { Check, Copy, FileDown } from 'lucide-react';
import {
  nomeDeFicheiro,
  textoDoCarrossel,
  type CarrosselParaTexto,
  type SlideParaTexto,
} from '@/lib/carrossel-texto';

/**
 * Levar o carrossel daqui, em texto.
 *
 * O desenho faz-se no CarouselSnap; o que se escreve aqui tem de conseguir
 * chegar lá. Duas maneiras, porque são duas situações: copiar, para quem tem
 * as duas janelas abertas; descarregar, para quem vai tratar disto amanhã.
 *
 * O feitio do texto é o que a Fábrica sempre soube ler — "Slide 1:", uma
 * linha por slide — e por isso serve dos dois lados sem ninguém arrumar nada.
 */
export function LevarTexto({
  carrossel,
  slides,
  compacto = false,
}: {
  carrossel: CarrosselParaTexto;
  slides: SlideParaTexto[];
  /** só o botão de copiar, para caber numa lista */
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  const texto = textoDoCarrossel(carrossel, slides);
  if (!texto) return null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // browsers que não deixam copiar sem um gesto reconhecido, ou sem https
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function descarregar() {
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeDeFicheiro(carrossel.title ?? carrossel.topic);
    a.click();
    URL.revokeObjectURL(url);
  }

  if (compacto) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          copiar();
        }}
        className="text-xs font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
        title="Copiar o texto do carrossel"
      >
        {copiado ? 'Copiado' : 'Copiar texto'}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={copiar} className="btn-fantasma text-sm">
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copiado ? 'Copiado' : 'Copiar texto'}
      </button>
      <button onClick={descarregar} className="btn-fantasma text-sm">
        <FileDown className="h-4 w-4" />
        Descarregar .txt
      </button>
    </div>
  );
}
