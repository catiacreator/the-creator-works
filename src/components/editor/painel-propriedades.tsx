'use client';

import { useEditor } from '@/lib/editor-store';
import type { Elemento, ElementoTexto, ElementoImagem, ElementoForma } from '@/lib/types';
import { PaletaCores } from './cores';
import { EfeitosTexto } from './efeitos-texto';


export function PainelPropriedades() {
  const { slides, slideAtivo, selecionado, patchElemento } = useEditor();

  const el = slides[slideAtivo]?.elementos.find((e) => e.id === selecionado);

  if (!el) {
    return (
      <aside className="w-64 shrink-0 border-l border-edLinha bg-edSuperficie/30 p-4">
        <p className="text-xs text-edSuave leading-relaxed">
          Clica num elemento do slide para editar as propriedades.
        </p>
      </aside>
    );
  }

  const p = (patch: Partial<Elemento>) => patchElemento(el.id, patch);

  return (
    <aside className="w-64 shrink-0 border-l border-edLinha bg-edSuperficie/30 p-4 overflow-y-auto space-y-4 text-sm">
      {(el.tipo === 'texto' || el.tipo === 'balao') && (
        <TextoProps el={el as ElementoTexto} p={p} />
      )}

      {el.tipo === 'imagem' && (
        <>
          <Slider label="Arredondar" v={(el as ElementoImagem).raio} min={0} max={200}
                  set={(v) => p({ raio: v } as any)} />
          <div>
            <p className="etiqueta">Moldura</p>
            <select className="campo" value={(el as ElementoImagem).mockup ?? 'nenhum'}
                    onChange={(e) => p({ mockup: e.target.value } as any)}>
              <option value="nenhum">Sem moldura</option>
              <option value="telemovel">Telemóvel</option>
              <option value="polaroid">Polaroid</option>
              <option value="browser">Janela de browser</option>
            </select>
          </div>
        </>
      )}

      {el.tipo === 'forma' && (
        <>
          <PaletaCores label="Cor" valor={(el as ElementoForma).cor} set={(c) => p({ cor: c } as any)} comTransparente={false} />
          <Slider label="Arredondar" v={(el as ElementoForma).raio} min={0} max={999}
                  set={(v) => p({ raio: v } as any)} />
          <Slider label="Opacidade" v={(el as ElementoForma).opacidade} min={5} max={100}
                  set={(v) => p({ opacidade: v } as any)} />
        </>
      )}

      <Slider label="Rotação" v={el.rot} min={-45} max={45} set={(v) => p({ rot: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Numero label="X %" v={el.x} set={(v) => p({ x: v })} />
        <Numero label="Y %" v={el.y} set={(v) => p({ y: v })} />
        <Numero label="Larg %" v={el.w} set={(v) => p({ w: v })} />
        <Numero label="Alt %" v={el.h} set={(v) => p({ h: v })} />
      </div>
    </aside>
  );
}

function TextoProps({ el, p }: { el: ElementoTexto; p: (x: Partial<Elemento>) => void }) {
  return (
    <>
      <div>
        <p className="etiqueta">Texto</p>
        <textarea className="campo min-h-[80px] resize-y" value={el.texto}
                  onChange={(e) => p({ texto: e.target.value } as any)} />
      </div>
      <PaletaCores label="Fundo do texto" valor={el.fundo} set={(c) => p({ fundo: c } as any)} />
      <EfeitosTexto el={el} p={p} />
      <Slider label="Arredondar o fundo" v={el.raio} min={0} max={999} set={(v) => p({ raio: v } as any)} />
      {el.tipo === 'balao' && (
        <div>
          <p className="etiqueta">Bico do balão</p>
          <select className="campo" value={el.bico ?? 'nenhum'}
                  onChange={(e) => p({ bico: e.target.value } as any)}>
            <option value="nenhum">Sem bico</option>
            <option value="esq">Esquerda</option>
            <option value="dir">Direita</option>
          </select>
        </div>
      )}
    </>
  );
}

function Slider({ label, v, min, max, set }: { label: string; v: number; min: number; max: number; set: (v: number) => void }) {
  return (
    <div>
      <p className="etiqueta">{label} — {v}</p>
      <input type="range" min={min} max={max} value={v}
             onChange={(e) => set(+e.target.value)} className="w-full accent-brand" />
    </div>
  );
}

function Numero({ label, v, set }: { label: string; v: number; set: (v: number) => void }) {
  return (
    <label className="block">
      <span className="etiqueta">{label}</span>
      <input type="number" className="campo py-1.5" value={v}
             onChange={(e) => set(+e.target.value)} />
    </label>
  );
}
