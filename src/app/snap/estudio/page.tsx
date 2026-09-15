'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TEMPLATES, limparSlide, type TemplateSlide } from '@/snap/templates';
import type { SlideDoDrop } from '@/snap/drop-content';

/**
 * O estúdio do CarouselSnap: os 18 templates a desenhar de verdade.
 *
 * Veio depressa por uma razão que não é mérito nenhum meu — os templates
 * dela sabem desenhar-se sozinhos. Cada um traz a sua função `render` que
 * devolve o HTML pronto, e por isso não foi preciso portar as cinco mil
 * linhas de editor: bastou trazer os templates e dar-lhes os slides.
 *
 * O texto passa SEMPRE pelo `limparSlide` antes de chegar a um template.
 * Os `render` metem o que recebem directamente no HTML, e sem essa passagem
 * um título com marcação lá dentro executava. Os templates ficam como ela os
 * escreveu; quem trata disso é a porta, não eles.
 *
 * Os slides vêm do Drop Content, pela memória do separador. Não é elegante e
 * é honesto: ainda não há onde os guardar deste lado, e inventar uma tabela
 * agora era decidir o modelo de dados do Snap a correr, no fim de um dia
 * grande. Enquanto não houver, ao menos não se perde o caminho entre os dois
 * ecrãs — que é o que importa hoje.
 */

const GUARDADO = 'snap-slides';

export default function EstudioPage() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [c1, setC1] = useState(TEMPLATES[0].defaults.c1);
  const [c2, setC2] = useState(TEMPLATES[0].defaults.c2);
  const [meus, setMeus] = useState<SlideDoDrop[] | null>(null);

  useEffect(() => {
    try {
      const cru = window.sessionStorage.getItem(GUARDADO);
      if (cru) setMeus(JSON.parse(cru) as SlideDoDrop[]);
    } catch {
      /* memória do separador fechada ou cheia: fica-se com os de exemplo */
    }
  }, []);

  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0],
    [templateId],
  );

  /** trocar de template traz as cores dele — são metade do desenho */
  function escolher(id: string) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setC1(t.defaults.c1);
    setC2(t.defaults.c2);
  }

  const slides: TemplateSlide[] = useMemo(() => {
    if (!meus?.length) return template.slides;
    return meus.map((s) => ({
      label: s.tipo_slide,
      title: s.texto_principal,
      sub: s.texto_secundario,
      tag: String(s.numero).padStart(2, '0'),
    }));
  }, [meus, template]);

  const cfg = { c1, c2, font: 'Poppins', bgUrl: null };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold text-snapTexto">Estúdio</h2>
          <p className="mt-0.5 text-[13px] font-light text-snapApagado">
            {meus?.length
              ? `Os teus ${meus.length} slides, nos 18 templates.`
              : 'Escolhe um template. Traz slides do Drop Content para os veres aqui.'}
          </p>
        </div>

        {!meus?.length && (
          <Link
            href="/snap/drop"
            className="flex items-center gap-1.5 text-[12.5px] text-snapApagado transition-colors hover:text-snapTexto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Ir ao Drop Content
          </Link>
        )}
      </div>

      {/* ── os templates ────────────────────────────── */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => escolher(t.id)}
            className={`rounded-full border px-3.5 py-1 text-[11.5px] font-medium transition-all ${
              t.id === templateId
                ? 'border-snapDestaque bg-snapDestaque text-snapSobreDestaque'
                : 'border-snapBorda bg-snapCartao text-snapApagado hover:border-snapDestaque'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* ── as duas cores ───────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-snapBorda bg-snapCartao p-3.5">
        {(
          [
            ['Fundo', c1, setC1],
            ['Destaque', c2, setC2],
          ] as const
        ).map(([nome, valor, muda]) => (
          <label key={nome} className="flex items-center gap-2 text-[12.5px] text-snapApagado">
            {nome}
            <input
              type="color"
              value={valor}
              onChange={(e) => muda(e.target.value)}
              className="h-7 w-10 cursor-pointer rounded border border-snapBorda bg-transparent"
            />
            <code className="text-[11px] text-snapApagado/70">{valor}</code>
          </label>
        ))}

        <button
          onClick={() => escolher(templateId)}
          className="ml-auto text-[11.5px] text-snapApagado underline-offset-2 hover:text-snapTexto hover:underline"
        >
          Voltar às cores do template
        </button>
      </div>

      {/* ── os slides desenhados ────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slides.map((s, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-snapBorda">
            {/*
              O HTML vem da função do template — código dela, não de fora.
              O que vem de fora é o texto, e esse passa pelo limparSlide antes
              de aqui chegar. É essa passagem que torna isto seguro.
            */}
            <div
              className="aspect-square w-full [&>*]:h-full [&>*]:w-full"
              dangerouslySetInnerHTML={{ __html: template.render(limparSlide(s), cfg) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
