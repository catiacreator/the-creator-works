'use client';

import { useState } from 'react';
import { PreviewFormato } from '@/components/criar/preview-formato';
import {
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
      className={`relative flex cursor-pointer flex-col rounded-[1.25rem] border bg-superficie p-6 transition ${
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

/** A grelha da vitrine dos formatos. */
export function Vitrine({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

/** O título de uma família de formatos, dentro da vitrine. */
export function Familia({ titulo, nota }: { titulo: string; nota?: string }) {
  return (
    <div className="mb-4 mt-10 flex items-center gap-3 first:mt-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {titulo}
      </span>
      {nota && <span className="text-xs text-muted/70">{nota}</span>}
      <span className="h-px flex-1 bg-sand" />
    </div>
  );
}

/**
 * O card de um formato na vitrine: o desenho do formato em cima — ou o
 * exemplo real, se já houver um em `public/formatos` — e por baixo o nome,
 * a linha do que é e o (i) para a instrução completa.
 */
export function CartaoFormato({
  tipo,
  id,
  nome,
  curto,
  detalhe,
  imagem,
  escolhido,
  onClick,
}: {
  tipo: string;
  id: string;
  nome: string;
  curto: string;
  detalhe?: string;
  imagem?: string;
  escolhido?: boolean;
  onClick: () => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-[1.25rem] border bg-superficie p-3 transition ${
        escolhido
          ? 'border-ink shadow-soft'
          : 'border-sand hover:border-ink/40 hover:shadow-soft'
      }`}
    >
      <PreviewFormato tipo={tipo} id={id} imagem={imagem} />

      <div className="relative px-2 pb-1 pt-3.5">
        {detalhe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAberto(!aberto);
            }}
            className={`absolute right-0 top-3 rounded-full p-1 transition ${
              aberto ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
            title="Como se escreve"
          >
            <Info className="h-4 w-4" />
          </button>
        )}

        <span className="block pr-6 text-[15px] font-semibold leading-snug tracking-tight">
          {nome}
        </span>
        <span
          className={`mt-1 block text-[13px] leading-relaxed text-muted ${
            aberto ? '' : 'line-clamp-2'
          }`}
        >
          {aberto && detalhe ? detalhe : curto}
        </span>
      </div>

      {escolhido && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-paper">
          ✓
        </span>
      )}
    </div>
  );
}
