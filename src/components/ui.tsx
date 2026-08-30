'use client';

import clsx from 'clsx';
import type { ComponentType, ReactNode } from 'react';
import { GuiaDaPagina } from './guia';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card', className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-sand pb-5">
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
          )}
        </div>
        {action}
      </div>

      {/* o guia desta página, sempre à mão de quem chega agora */}
      <GuiaDaPagina />
    </>
  );
}

/**
 * Separador de secções, como o da referência: pílulas numa faixa clara.
 * Serve para partir uma página comprida em capítulos sem mudar de endereço.
 */
export function Separador<T extends string>({
  valor,
  set,
  opcoes,
}: {
  valor: T;
  set: (v: T) => void;
  opcoes: Array<{ id: T; label: string; icone?: ComponentType<{ className?: string }> }>;
}) {
  return (
    <div className="mb-6 flex gap-1 rounded-2xl border border-sand bg-creme/70 p-1">
      {opcoes.map((o) => (
        <button
          key={o.id}
          onClick={() => set(o.id)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
            valor === o.id
              ? 'bg-white font-medium text-ink shadow-soft'
              : 'text-muted hover:text-ink'
          }`}
        >
          {o.icone && <o.icone className="h-4 w-4" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Barra de ações colada ao fundo, como na referência. */
export function BarraDeAcoes({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-8 mt-8 flex flex-wrap items-center gap-3 border-t border-sand bg-paper/90 px-8 py-4 backdrop-blur">
      {children}
    </div>
  );
}

const STATUS: Record<string, string> = {
  draft: 'bg-creme text-muted',
  writing: 'bg-creme text-ink',
  imaging: 'bg-creme text-ink',
  rendering: 'bg-rosaSuave text-rosa',
  ready: 'bg-ink text-white',
  failed: 'bg-rose-100 text-rose-800',
  queued: 'bg-creme text-muted',
  running: 'bg-creme text-ink',
  done: 'bg-ink text-white',
  pending: 'bg-creme text-muted',
  cancelled: 'bg-creme text-muted',
};

const LABEL: Record<string, string> = {
  draft: 'rascunho',
  writing: 'a escrever',
  imaging: 'a gerar foto',
  rendering: 'a compor',
  ready: 'pronto',
  failed: 'falhou',
  queued: 'em fila',
  running: 'a correr',
  done: 'feito',
  pending: 'à espera',
  cancelled: 'cancelado',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={clsx('pill', STATUS[status] ?? 'bg-sand text-muted')}>
      {LABEL[status] ?? status}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-sand bg-white/50 p-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rosaSuave border-t-rosa" />
      {label}
    </span>
  );
}

/**
 * Janela de confirmação da app — em vez da do browser, que é feia,
 * não combina com nada e em alguns contextos nem sequer aparece.
 */
export function Dialogo({
  titulo,
  texto,
  confirmar,
  perigo,
  ocupado,
  aoConfirmar,
  aoFechar,
  children,
}: {
  titulo: string;
  texto?: string;
  confirmar: string;
  perigo?: boolean;
  ocupado?: boolean;
  aoConfirmar: () => void;
  aoFechar: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-semibold">{titulo}</h2>
        {texto && <p className="mb-4 text-sm leading-relaxed text-muted">{texto}</p>}
        {children}
        <div className="flex gap-2">
          <button
            className={perigo ? 'btn bg-rosa text-white hover:bg-[#DC3F7C]' : 'btn-primary'}
            onClick={aoConfirmar}
            disabled={ocupado}
          >
            {ocupado ? 'A trabalhar…' : confirmar}
          </button>
          <button className="btn-ghost ml-auto" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
