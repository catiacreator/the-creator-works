'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CATEGORIAS_DE_GANCHOS, filtrarGanchos } from '@/lib/biblioteca-ganchos';

/**
 * A biblioteca de ganchos, dentro do editor.
 *
 * O primeiro slide é o que decide se alguém pára ou passa à frente, e é
 * sempre o mais difícil de escrever. Aqui estão cem aberturas arrumadas por
 * sentimento: escolhes uma, entra no slide como título, e trocas o que está
 * entre [colchetes] pelo que é teu.
 */
export function Ganchos({ usar }: { usar: (texto: string) => void }) {
  const [categoria, setCategoria] = useState('Todos');
  const [procura, setProcura] = useState('');

  const encontrados = useMemo(
    () => filtrarGanchos(categoria, procura),
    [categoria, procura],
  );

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-edSuave">
        Carrega num gancho e ele entra no slide como título. Depois trocas o que
        está entre [colchetes] pelo que é teu.
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-edSuave" />
        <input
          value={procura}
          onChange={(e) => setProcura(e.target.value)}
          placeholder="Procurar gancho…"
          className="campo pl-8 text-xs"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {CATEGORIAS_DE_GANCHOS.map((c) => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`chip text-[10px] ${categoria === c ? 'chip-ativo' : ''}`}
          >
            {c}
          </button>
        ))}
      </div>

      {encontrados.length === 0 ? (
        <p className="py-6 text-center text-xs text-edSuave">
          Nenhum gancho com essas palavras.
        </p>
      ) : (
        <>
          <p className="text-[10px] uppercase tracking-wider text-edSuave">
            {encontrados.length} {encontrados.length === 1 ? 'gancho' : 'ganchos'}
          </p>
          <div className="space-y-1.5">
            {encontrados.map((g, i) => (
              <button
                key={`${g.categoria}-${i}`}
                onClick={() => usar(g.texto)}
                title="Pôr este gancho no slide"
                className="w-full rounded-xl border border-edLinha p-2.5 text-left transition
                           hover:border-rosa hover:bg-edFundo"
              >
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-brand-soft">
                  {g.categoria}
                </span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-edTexto">
                  {g.texto}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
