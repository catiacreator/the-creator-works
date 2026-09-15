'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Search } from 'lucide-react';
import { GANCHOS, CATEGORIAS } from '@/snap/ganchos';

/**
 * A biblioteca de ganchos do CarouselSnap.
 *
 * Portada do `HookLibrary.tsx` do Snap, com o desenho dele: os cartões de
 * canto redondo, a etiqueta da categoria em maiúsculas pequenas e laranja, o
 * levantar de um pixel ao passar o rato. Os cem ganchos são os mesmos, na
 * mesma ordem, nas mesmas categorias.
 *
 * Duas coisas mudam, e nenhuma é de aspecto:
 *
 *   **Sai o i18n.** O Snap traduz a interface em tempo real com o
 *   `useLanguage`. Isso é uma peça inteira que ainda não veio; até vir, os
 *   textos ficam em português, que é a língua em que ela escreve.
 *
 *   **Carregar num gancho copia-o.** Lá, o clique manda-o para o gerador
 *   que está ao lado, no mesmo ecrã. Esse gerador ainda não chegou, e um
 *   botão que não faz nada é pior do que um botão que faz pouco. Quando o
 *   gerador vier, o clique volta a ser o dele.
 */
export default function SnapGanchosPage() {
  const [activeCat, setActiveCat] = useState('Todas');
  const [search, setSearch] = useState('');
  const [copiado, setCopiado] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return GANCHOS.filter((g) => {
      const matchCat = activeCat === 'Todas' || g.cat === activeCat;
      const matchSearch =
        !q || g.text.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCat, search]);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(texto);
      window.setTimeout(() => setCopiado((c) => (c === texto ? null : c)), 1600);
    } catch {
      /* o browser não deixou; a pessoa selecciona e copia à mão */
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[22px] font-semibold text-snapTexto">Biblioteca de ganchos</h2>
        <p className="mt-0.5 text-[13px] font-light text-snapApagado">
          Cem aberturas prontas. Carrega numa para copiar — o que está entre [colchetes] é para
          trocares pelo que é teu.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`rounded-full border px-3.5 py-1 text-[11.5px] font-medium transition-all ${
              activeCat === cat
                ? 'border-snapDestaque bg-snapDestaque text-snapSobreDestaque'
                : 'border-snapBorda bg-snapCartao text-snapApagado hover:border-snapDestaque hover:bg-snapDestaque hover:text-snapSobreDestaque'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-snapApagado/60" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Procurar ganchos…"
          className="w-full rounded-[10px] border border-snapBorda bg-snapCartao py-2.5 pl-10 pr-4 text-sm text-snapTexto outline-none transition-colors placeholder:text-snapApagado/50 focus:border-snapDestaque"
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="col-span-full py-8 text-center text-sm text-snapApagado">
            Nenhum gancho com essas palavras.
          </div>
        ) : (
          filtered.map((g, i) => (
            <button
              key={i}
              onClick={() => copiar(g.text)}
              className="group flex flex-col gap-1.5 rounded-xl border border-snapBorda bg-snapCartao p-3.5 text-left transition-all hover:-translate-y-px hover:border-snapDestaque/60 hover:shadow-[0_4px_16px_rgba(193,122,90,0.13)]"
            >
              <span className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-snapDestaque">
                {g.cat}
              </span>
              <span className="text-[13px] leading-relaxed text-snapTexto">{g.text}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[10.5px] font-medium text-snapApagado/60">
                {copiado === g.text ? (
                  <>
                    <Check className="h-3 w-3 text-snapDestaque" />
                    copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    carrega para copiar
                  </>
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
