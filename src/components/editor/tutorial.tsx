'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';

export interface Passo {
  /** o que iluminar; vazio quer dizer um cartão ao meio do ecrã */
  alvo: string;
  titulo: string;
  corpo: string;
}

export const PASSOS: Passo[] = [
  {
    alvo: '',
    titulo: 'Isto é o editor',
    corpo:
      'Em seis passos mostro-te onde está cada coisa. Podes sair a meio — e voltar quando quiseres, pelo ponto de interrogação lá em cima.',
  },
  {
    alvo: '[data-tour="ferramentas"]',
    titulo: 'Tudo o que entra no slide',
    corpo:
      'Templates, fundo, texto, ganchos, balões, imagens, stickers e formas. Carregas e aparece no slide, no meio, à espera que o arrastes.',
  },
  {
    alvo: '[data-tour="ganchos"]',
    titulo: 'Cem aberturas prontas',
    corpo:
      'O primeiro slide é o que trava o dedo de quem passa. Aqui tens cem ganchos arrumados por sentimento — escolhes um e trocas o que está entre [colchetes] pelo que é teu.',
  },
  {
    alvo: '[data-tour="canvas"]',
    titulo: 'O slide',
    corpo:
      'Arrasta para mover, agarra os cantos para redimensionar, carrega duas vezes num texto para o escrever. ⌘Z desfaz sempre.',
  },
  {
    alvo: '[data-tour="tira"]',
    titulo: 'Os slides todos',
    corpo:
      'A ordem em que saem no Instagram. Arrasta para trocar, duplica o que já está bom, e continua a partir dele.',
  },
  {
    alvo: '[data-tour="historico"]',
    titulo: 'O caminho de volta',
    corpo:
      'Cada vez que guardas, a versão anterior fica arrumada aqui. Se estragares um slide, repões a boa com um clique.',
  },
  {
    alvo: '[data-tour="download"]',
    titulo: 'Levar daqui para fora',
    corpo:
      'Descarrega só este slide ou o carrossel todo, e escolhe o tamanho: Full HD é o do Instagram, 4K para ampliar depois.',
  },
];

const CHAVE = 'editor-tutorial-visto';

/** Já viu isto alguma vez? */
export function tutorialPorVer() {
  try {
    return window.localStorage.getItem(CHAVE) !== '1';
  } catch {
    return false;
  }
}

function marcarVisto() {
  try {
    window.localStorage.setItem(CHAVE, '1');
  } catch {
    // sem armazenamento, o tutorial volta a aparecer — chato, não grave
  }
}

interface Caixa {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * A visita guiada do editor.
 *
 * Aparece sozinha da primeira vez que se entra, e depois só a pedido. Ilumina
 * um sítio de cada vez e diz o que ali se faz — que é mais depressa do que ler
 * um manual que ninguém lê.
 */
export function Tutorial({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const [i, setI] = useState(0);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);
  useEffect(() => {
    if (aberto) setI(0);
  }, [aberto]);

  const passo = PASSOS[i];

  // onde está o elemento deste passo, agora — as janelas mudam de tamanho
  useLayoutEffect(() => {
    if (!aberto || !passo?.alvo) {
      setCaixa(null);
      return;
    }
    function medir() {
      const el = document.querySelector(passo.alvo);
      if (!el) {
        setCaixa(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setCaixa({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [aberto, passo]);

  // as setas e o Escape, que é como se anda numa visita destas
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') sair();
      if (e.key === 'ArrowRight') seguinte();
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, i]);

  if (!aberto || !montado || !passo) return null;

  function sair() {
    marcarVisto();
    fechar();
  }

  function seguinte() {
    if (i < PASSOS.length - 1) setI(i + 1);
    else sair();
  }

  const margem = 8;
  const recorte = caixa
    ? {
        top: caixa.top - margem,
        left: caixa.left - margem,
        width: caixa.width + margem * 2,
        height: caixa.height + margem * 2,
      }
    : null;

  /** O cartão vai por baixo do alvo, ou por cima quando não há espaço. */
  const posicao = recorte
    ? recorte.top + recorte.height + 320 < window.innerHeight
      ? { top: recorte.top + recorte.height + 12, left: Math.min(recorte.left, window.innerWidth - 360) }
      : { top: Math.max(12, recorte.top - 232), left: Math.min(recorte.left, window.innerWidth - 360) }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* o escurecido, com um buraco onde está o que interessa */}
      <div
        className="absolute inset-0 bg-black/65 transition-all"
        style={
          recorte
            ? {
                clipPath: `polygon(
                  0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                  ${recorte.left}px ${recorte.top}px,
                  ${recorte.left}px ${recorte.top + recorte.height}px,
                  ${recorte.left + recorte.width}px ${recorte.top + recorte.height}px,
                  ${recorte.left + recorte.width}px ${recorte.top}px,
                  ${recorte.left}px ${recorte.top}px
                )`,
              }
            : undefined
        }
        onClick={sair}
      />

      {recorte && (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-rosa"
          style={{
            top: recorte.top,
            left: recorte.left,
            width: recorte.width,
            height: recorte.height,
          }}
        />
      )}

      <div
        className="absolute w-[340px] rounded-2xl border border-edLinha bg-edSuperficie p-5 text-edTexto shadow-lift"
        style={
          posicao ?? {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }
        }
      >
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-soft" />
          <p className="text-sm font-semibold">{passo.titulo}</p>
          <button onClick={sair} className="ml-auto rounded-full p-1 text-edSuave hover:text-edTexto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mb-4 text-[13px] leading-relaxed text-edSuave">{passo.corpo}</p>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-edSuave">
            {i + 1} de {PASSOS.length}
          </span>

          <button
            onClick={() => setI(Math.max(0, i - 1))}
            disabled={i === 0}
            className="btn-fantasma ml-auto p-1.5 disabled:opacity-30"
            title="Anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={seguinte} className="btn-primario text-xs">
            {i === PASSOS.length - 1 ? 'Já percebi' : 'Seguinte'}
            {i < PASSOS.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>

        <button onClick={sair} className="mt-2 text-[11px] text-edSuave underline hover:text-edTexto">
          Saltar a visita
        </button>
      </div>
    </div>,
    document.body,
  );
}
