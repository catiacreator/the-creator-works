'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Loader2, Sparkles, Wand2 } from 'lucide-react';
import type { SlideDoDrop } from '@/snap/drop-content';

/**
 * O Drop Content: de um tema para um carrossel escrito.
 *
 * É a peça que faz o Snap ser o Snap. Colas um tema, um texto solto, uma
 * ideia de duas linhas — e sai um roteiro com o número de slides que pediste,
 * com capa, conteúdo e CTA.
 *
 * Duas maneiras, e a diferença entre elas é tudo:
 *
 *   **Escrever** — ela escreve o carrossel a partir do que lhe deres.
 *
 *   **Separar** — tu já escreveste, e ela só parte o texto em slides sem
 *   mexer numa palavra. Para quem já tem o roteiro na cabeça e não quer que
 *   ninguém lhe «melhore» as frases.
 *
 * O ecrã do Snap tem isto encostado ao estúdio visual — as paletas, as
 * tipografias, as formas de fundo. Esse estúdio são cinco mil linhas e ainda
 * não veio; por agora o que sai daqui copia-se, e o desenho faz-se do outro
 * lado, no Editor que já existe.
 */
export default function DropPage() {
  const [conteudo, setConteudo] = useState('');
  const [slides, setSlides] = useState(8);
  const [modo, setModo] = useState<'escrever' | 'separar'>('escrever');

  const [aTrabalhar, setATrabalhar] = useState(false);
  const [saiu, setSaiu] = useState<SlideDoDrop[] | null>(null);
  const [resumo, setResumo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function gerar() {
    if (!conteudo.trim()) return setErro('Escreve ou cola alguma coisa primeiro.');
    setATrabalhar(true);
    setErro(null);
    setSaiu(null);

    const r = await fetch('/api/snap/drop-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conteudo, modo, slides }),
    })
      .then((x) => x.json())
      .catch(() => ({ error: 'Não consegui falar com a Cát.IA.' }));

    setATrabalhar(false);
    if (r.error) return setErro(r.error);
    const lista = r.slides as SlideDoDrop[];
    setSaiu(lista);
    setResumo((r.resumo_conteudo as string) || null);

    // guardados na memória do separador, para o Estúdio os encontrar.
    // Não é elegante e é honesto: ainda não há onde os guardar deste lado,
    // e o que importa hoje é não se perder o caminho entre os dois ecrãs.
    try {
      window.sessionStorage.setItem('snap-slides', JSON.stringify(lista));
    } catch {
      /* memória cheia ou fechada: o Estúdio mostra os slides de exemplo */
    }
  }

  /** O carrossel todo num texto só, pronto a colar noutro sítio. */
  function tudoJunto(lista: SlideDoDrop[]) {
    return lista
      .map((s) =>
        [`Slide ${s.numero}: ${s.texto_principal}`, s.texto_secundario]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n');
  }

  async function copiar(texto: string, marca: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(marca);
      window.setTimeout(() => setCopiado((c) => (c === marca ? null : c)), 1600);
    } catch {
      setErro('O browser não deixou copiar. Selecciona e copia à mão.');
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[22px] font-semibold text-snapTexto">Drop Content</h2>
        <p className="mt-0.5 text-[13px] font-light text-snapApagado">
          Cola um tema, um texto ou uma ideia. Sai um carrossel escrito, slide a slide.
        </p>
      </div>

      {erro && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {erro}
        </p>
      )}

      <div className="rounded-xl border border-snapBorda bg-snapCartao p-4">
        {/* ── escrever ou separar ─────────────────────── */}
        <div className="mb-3 flex gap-1.5">
          {(
            [
              ['escrever', 'Escrever por mim', Sparkles],
              ['separar', 'Já escrevi — só separa', Wand2],
            ] as const
          ).map(([id, rotulo, Icone]) => (
            <button
              key={id}
              onClick={() => setModo(id)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[11.5px] font-medium transition-all ${
                modo === id
                  ? 'border-snapDestaque bg-snapDestaque text-snapSobreDestaque'
                  : 'border-snapBorda text-snapApagado hover:border-snapDestaque'
              }`}
            >
              <Icone className="h-3 w-3" />
              {rotulo}
            </button>
          ))}
        </div>

        <textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          rows={7}
          placeholder={
            modo === 'escrever'
              ? 'Ex: 3 razões pelas quais o teu conteúdo não cresce...'
              : 'Cola aqui o roteiro que já escreveste. Não lhe toco numa palavra.'
          }
          className="w-full resize-y rounded-[10px] border border-snapBorda bg-snapFundo p-3 text-sm leading-relaxed text-snapTexto outline-none transition-colors placeholder:text-snapApagado/50 focus:border-snapDestaque"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* separar não inventa slides: o número sai do que lá está escrito */}
          {modo === 'escrever' && (
            <label className="flex items-center gap-2 text-[12.5px] text-snapApagado">
              Slides
              <input
                type="number"
                min={3}
                max={20}
                value={slides}
                onChange={(e) => setSlides(Number(e.target.value))}
                className="w-16 rounded-lg border border-snapBorda bg-snapFundo px-2 py-1 text-center text-snapTexto outline-none focus:border-snapDestaque"
              />
            </label>
          )}

          <button
            onClick={gerar}
            disabled={aTrabalhar}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-snapDestaque px-4 py-2 text-[13px] font-medium text-snapSobreDestaque transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {aTrabalhar ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                A escrever…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {modo === 'escrever' ? 'Gerar carrossel' : 'Separar em slides'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── o que saiu ──────────────────────────────── */}
      {saiu && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold text-snapTexto">
                {saiu.length} slides
              </h3>
              {resumo && <p className="text-[12.5px] text-snapApagado">{resumo}</p>}
            </div>
            <button
              onClick={() => copiar(tudoJunto(saiu), '__tudo__')}
              className="flex items-center gap-1.5 rounded-full border border-snapBorda px-3 py-1.5 text-[11.5px] font-medium text-snapApagado transition-colors hover:border-snapDestaque hover:text-snapTexto"
            >
              {copiado === '__tudo__' ? (
                <Check className="h-3 w-3 text-snapDestaque" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              Copiar tudo
            </button>
          </div>

          <div className="space-y-2.5">
            {saiu.map((s) => (
              <div
                key={s.numero}
                className="rounded-xl border border-snapBorda bg-snapCartao p-3.5"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-snapDestaque">
                    {s.numero}. {s.tipo_slide}
                  </span>
                  <button
                    className="ml-auto text-snapApagado/60 transition-colors hover:text-snapTexto"
                    onClick={() =>
                      copiar(
                        [s.texto_principal, s.texto_secundario].filter(Boolean).join('\n'),
                        String(s.numero),
                      )
                    }
                    title="Copiar este slide"
                  >
                    {copiado === String(s.numero) ? (
                      <Check className="h-3.5 w-3.5 text-snapDestaque" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-[14px] leading-relaxed text-snapTexto">{s.texto_principal}</p>
                {s.texto_secundario && (
                  <p className="mt-1 text-[13px] leading-relaxed text-snapApagado">
                    {s.texto_secundario}
                  </p>
                )}
                {s.nota_design && (
                  <p className="mt-2 border-t border-snapBorda pt-2 text-[11.5px] italic text-snapApagado/70">
                    {s.nota_design}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/snap/estudio"
              className="flex items-center gap-1.5 rounded-full bg-snapDestaque px-4 py-2 text-[13px] font-medium text-snapSobreDestaque transition-opacity hover:opacity-90"
            >
              Ver nos templates
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="text-[12px] leading-relaxed text-snapApagado">
              Os 18 templates do Snap. Ou copia o texto e leva-o à Fábrica do outro lado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
