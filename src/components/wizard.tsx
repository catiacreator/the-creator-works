'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, X } from 'lucide-react';

interface Passo {
  id: string;
  titulo: string;
  texto: string;
  href: string;
  feito: boolean;
}

/**
 * Os primeiros passos, no topo das páginas.
 * Mostra onde estás e o que falta. Quando estiver tudo feito, desaparece
 * sozinho — e podes fechá-lo antes disso, que não volta.
 */
export function Wizard({ destaque }: { destaque?: string }) {
  const [passos, setPassos] = useState<Passo[] | null>(null);
  const [completo, setCompleto] = useState(false);
  const [fechado, setFechado] = useState(true);

  useEffect(() => {
    setFechado(window.localStorage.getItem('wizard-fechado') === 'sim');
    fetch('/api/progresso')
      .then((r) => r.json())
      .then((d) => {
        setPassos(d.passos ?? []);
        setCompleto(!!d.completo);
      });
  }, []);

  if (!passos || completo || fechado) return null;

  const feitos = passos.filter((p) => p.feito).length;
  const aSeguir = passos.find((p) => !p.feito);

  return (
    <div className="mb-6 overflow-hidden rounded-[1.25rem] border border-sand bg-creme">
      <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
        <p className="text-sm font-semibold">Primeiros passos</p>
        <span className="text-xs text-muted">
          {feitos} de {passos.length} feitos
        </span>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-superficie">
          <div
            className="h-full rounded-full bg-rosa transition-all"
            style={{ width: `${(feitos / passos.length) * 100}%` }}
          />
        </div>
        <button
          onClick={() => {
            window.localStorage.setItem('wizard-fechado', 'sim');
            setFechado(true);
          }}
          className="ml-auto rounded-full p-1.5 text-muted transition hover:bg-superficie hover:text-ink"
          title="Esconder"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-5 pt-3">
        {passos.map((p) => {
          const agora = p.id === (destaque ?? aSeguir?.id);
          return (
            <Link
              key={p.id}
              href={p.href}
              title={p.texto}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition ${
                p.feito
                  ? 'border-sand bg-superficie text-muted'
                  : agora
                    ? 'border-rosa bg-rosa text-white'
                    : 'border-sand bg-superficie text-ink hover:border-rosa/50'
              }`}
            >
              {p.feito ? (
                <Check className="h-3.5 w-3.5 text-rosa" />
              ) : (
                <span
                  className={`h-3.5 w-3.5 rounded-full border ${
                    agora ? 'border-white' : 'border-sand'
                  }`}
                />
              )}
              {p.titulo}
              {agora && <ArrowRight className="h-3.5 w-3.5" />}
            </Link>
          );
        })}
      </div>

      {aSeguir && (
        <p className="border-t border-sand bg-superficie/60 px-5 py-2.5 text-xs text-muted">
          <strong className="text-ink">A seguir:</strong> {aSeguir.texto}
        </p>
      )}
    </div>
  );
}
