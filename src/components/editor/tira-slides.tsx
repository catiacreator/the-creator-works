'use client';

import { Plus, Copy, Trash2 } from 'lucide-react';
import { useEditor } from '@/lib/editor-store';
import { FORMATOS } from '@/lib/types';
import { ElementoVista } from './elemento-vista';

const LARGURA = 58; // largura da miniatura

export function TiraSlides() {
  const { slides, slideAtivo, setSlideAtivo, novoSlide, duplicarSlide, apagarSlide, formato } =
    useEditor();
  const { w, h } = FORMATOS[formato];
  const altura = (LARGURA * h) / w;

  return (
    <div className="flex items-center gap-3 overflow-x-auto border-t border-edLinha bg-edSuperficie/40 px-4 py-3">
      {slides.map((s, i) => (
        <button
          key={s.id}
          onClick={() => setSlideAtivo(i)}
          title={`Slide ${i + 1}`}
          className={`relative shrink-0 overflow-hidden rounded-lg border-2 transition ${
            i === slideAtivo ? 'border-brand' : 'border-edLinha hover:border-brand/40'
          }`}
          style={{ width: LARGURA, height: altura, background: s.fundoCor }}
        >
          {/* o slide em miniatura, tal como está */}
          {s.fundoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.fundoUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {s.fundoEscurecer > 0 && (
            <div
              className="absolute inset-0"
              style={{ background: `rgba(0,0,0,${s.fundoEscurecer / 100})` }}
            />
          )}
          {[...s.elementos]
            .sort((a, b) => a.z - b.z)
            .map((el) => (
              <ElementoVista key={el.id} el={el} larguraPx={LARGURA} editavel={false} />
            ))}

          <span
            className={`absolute bottom-0 right-0 rounded-tl px-1 text-[9px] leading-tight ${
              i === slideAtivo ? 'bg-brand text-white' : 'bg-black/45 text-white/80'
            }`}
          >
            {i + 1}
          </span>
        </button>
      ))}

      <div className="ml-2 flex shrink-0 gap-1">
        <button onClick={novoSlide} className="btn-fantasma p-2" title="Novo slide">
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={duplicarSlide} className="btn-fantasma p-2" title="Duplicar slide">
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={() => apagarSlide(slideAtivo)}
          disabled={slides.length === 1}
          className="btn-fantasma p-2"
          title="Apagar slide"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <span className="ml-auto shrink-0 text-xs text-edSuave">
        Slide {slideAtivo + 1} de {slides.length}
      </span>
    </div>
  );
}
