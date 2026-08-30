'use client';

import { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Film,
  LayoutGrid,
  Smartphone,
  TrendingUp,
  Heart,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';

export const ICONES: Record<string, LucideIcon> = {
  Film,
  LayoutGrid,
  Smartphone,
  TrendingUp,
  Heart,
  ShoppingBag,
};

/** O título centrado de cada passo, com a última palavra em cinzento. */
export function Pergunta({ texto, sub }: { texto: string; sub?: string }) {
  const palavras = texto.split(' ');
  const ultima = palavras.pop();
  return (
    <div className="mb-8 text-center">
      <h2 className="text-[36px] font-semibold leading-tight tracking-tight">
        {palavras.join(' ')} <span className="text-muted">{ultima}</span>
      </h2>
      {sub && <p className="mt-2 text-[15px] text-muted">{sub}</p>}
    </div>
  );
}

/** Um cartão de escolha. O (i) troca o resumo pela explicação completa. */
export function Cartao({
  nome,
  curto,
  icone,
  escolhido,
  onClick,
  detalhe,
  largura,
  etiqueta,
}: {
  nome: string;
  curto: string;
  icone?: LucideIcon;
  escolhido?: boolean;
  onClick: () => void;
  detalhe?: string;
  largura?: string;
  /** a família do formato, quando a há */
  etiqueta?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const Icone = icone;

  return (
    <div
      onClick={onClick}
      className={`relative flex cursor-pointer flex-col rounded-[1.25rem] border bg-white p-6 transition ${
        largura ?? ''
      } ${escolhido ? 'border-ink shadow-soft' : 'border-sand hover:border-ink/40 hover:shadow-soft'}`}
    >
      {detalhe && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAberto(!aberto);
          }}
          className={`absolute right-3 top-3 rounded-full p-1 transition ${
            aberto ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
          title="Como se escreve"
        >
          <Info className="h-4 w-4" />
        </button>
      )}

      {Icone && (
        <span
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition ${
            escolhido ? 'bg-ink text-white' : 'bg-creme text-ink'
          }`}
        >
          <Icone className="h-5 w-5" strokeWidth={1.8} />
        </span>
      )}

      {etiqueta && (
        <span className="mb-1.5 pr-6 text-[10px] font-semibold uppercase leading-tight tracking-wider text-muted">
          {etiqueta}
        </span>
      )}
      <span className="mb-1.5 text-[17px] font-semibold leading-snug tracking-tight">{nome}</span>
      <span className="text-sm leading-relaxed text-muted">
        {aberto && detalhe ? detalhe : curto}
      </span>
    </div>
  );
}

/** Faixa horizontal com setas — as listas de formatos são longas. */
export function Faixa({ children }: { children: React.ReactNode }) {
  const pista = useRef<HTMLDivElement>(null);
  const deslizar = (d: number) =>
    pista.current?.scrollBy({ left: d * pista.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <div className="relative px-5">
      <button
        onClick={() => deslizar(-1)}
        className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-sand bg-white text-muted shadow-soft transition hover:text-ink"
        title="Anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={pista}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <button
        onClick={() => deslizar(1)}
        className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-sand bg-white text-muted shadow-soft transition hover:text-ink"
        title="Seguinte"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
