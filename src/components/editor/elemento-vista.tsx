'use client';

import { useRef } from 'react';
import { cssDaFonte } from '@/lib/fontes-editor';
import type { Elemento, ElementoTexto, ElementoImagem, ElementoSticker, ElementoForma } from '@/lib/types';
import { useEditor } from '@/lib/editor-store';

interface Props {
  el: Elemento;
  larguraPx: number;      // largura real do canvas no ecrã
  editavel: boolean;      // false quando estamos a exportar
}

/** converte tamanhos definidos numa tela de 1080px para o tamanho no ecrã */
const escala = (v: number, larguraPx: number) => (v * larguraPx) / 1080;

export function ElementoVista({ el, larguraPx, editavel }: Props) {
  const { selecionado, selecionar, patchElemento, setGuias } = useEditor();
  const ativo = editavel && selecionado === el.id;
  const ref = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ x: number; y: number; ex: number; ey: number } | null>(null);
  const redim = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  function comecarArrasto(e: React.PointerEvent) {
    if (!editavel || el.locked) return;
    e.stopPropagation();
    selecionar(el.id);
    arrasto.current = { x: e.clientX, y: e.clientY, ex: el.x, ey: el.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function mover(e: React.PointerEvent) {
    const pai = ref.current?.parentElement;
    if (!pai) return;
    const r = pai.getBoundingClientRect();

    if (arrasto.current) {
      const dx = ((e.clientX - arrasto.current.x) / r.width) * 100;
      const dy = ((e.clientY - arrasto.current.y) / r.height) * 100;
      let x = Math.round((arrasto.current.ex + dx) * 10) / 10;
      let y = Math.round((arrasto.current.ey + dy) * 10) / 10;

      // encosta ao centro da folha quando passa perto — e acende a linha
      const alturaReal = ref.current ? (ref.current.offsetHeight / r.height) * 100 : el.h;
      const centroX = x + el.w / 2;
      const centroY = y + alturaReal / 2;
      const perto = 1.2;
      const noMeioV = Math.abs(centroX - 50) < perto;
      const noMeioH = Math.abs(centroY - 50) < perto;
      if (noMeioV) x = Math.round((50 - el.w / 2) * 10) / 10;
      if (noMeioH) y = Math.round((50 - alturaReal / 2) * 10) / 10;
      setGuias({ v: noMeioV, h: noMeioH });

      patchElemento(el.id, { x, y } as Partial<Elemento>);
    }

    if (redim.current) {
      const dx = ((e.clientX - redim.current.x) / r.width) * 100;
      const dy = ((e.clientY - redim.current.y) / r.height) * 100;
      patchElemento(el.id, {
        w: Math.max(5, Math.round((redim.current.w + dx) * 10) / 10),
        h: Math.max(3, Math.round((redim.current.h + dy) * 10) / 10),
      } as Partial<Elemento>);
    }
  }

  function largar(e: React.PointerEvent) {
    arrasto.current = null;
    redim.current = null;
    setGuias({ v: false, h: false });
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }

  const estiloBase: React.CSSProperties = {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    height: el.tipo === 'texto' || el.tipo === 'balao' ? 'auto' : `${el.h}%`,
    transform: `rotate(${el.rot}deg)`,
    zIndex: el.z,
    cursor: editavel && !el.locked ? 'move' : 'default',
    touchAction: 'none',
  };

  return (
    <div
      ref={ref}
      style={estiloBase}
      onPointerDown={comecarArrasto}
      onPointerMove={mover}
      onPointerUp={largar}
      className={ativo ? 'outline outline-2 outline-brand outline-offset-2 rounded-[2px]' : ''}
    >
      {(el.tipo === 'texto' || el.tipo === 'balao') && <Texto el={el as ElementoTexto} larguraPx={larguraPx} />}
      {el.tipo === 'sticker' && <Sticker el={el as ElementoSticker} larguraPx={larguraPx} />}
      {el.tipo === 'imagem' && <Imagem el={el as ElementoImagem} larguraPx={larguraPx} />}
      {el.tipo === 'forma' && <Forma el={el as ElementoForma} larguraPx={larguraPx} />}

      {ativo && !el.locked && (
        <span
          onPointerDown={(e) => {
            e.stopPropagation();
            redim.current = { x: e.clientX, y: e.clientY, w: el.w, h: el.h };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={mover}
          onPointerUp={largar}
          className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-full bg-brand
                     border-2 border-white cursor-nwse-resize"
        />
      )}
    </div>
  );
}

function Texto({ el, larguraPx }: { el: ElementoTexto; larguraPx: number }) {
  const bico = el.tipo === 'balao' && el.bico && el.bico !== 'nenhum';
  return (
    <div className="relative">
      <div
        style={{
          background: el.fundo,
          color: el.cor,
          fontFamily: cssDaFonte(el.fonte),
          fontSize: escala(el.tamanho, larguraPx),
          fontWeight: el.peso,
          fontStyle: el.italico ? 'italic' : 'normal',
          textAlign: el.alinhamento,
          borderRadius: escala(el.raio, larguraPx),
          padding: el.fundo === 'transparent' ? 0 : escala(24, larguraPx),
          lineHeight: 1.25,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...(el.contorno?.espessura
            ? {
                WebkitTextStrokeWidth: escala(el.contorno.espessura, larguraPx),
                WebkitTextStrokeColor: el.contorno.cor,
                paintOrder: 'stroke fill',
              }
            : {}),
          ...(el.sombra
            ? {
                textShadow: `${escala(el.sombra.x, larguraPx)}px ${escala(
                  el.sombra.y,
                  larguraPx,
                )}px ${escala(el.sombra.desfoque, larguraPx)}px ${el.sombra.cor}`,
              }
            : {}),
        }}
      >
        {el.texto}
      </div>
      {bico && (
        <span
          style={{
            position: 'absolute',
            bottom: -escala(14, larguraPx),
            [el.bico === 'esq' ? 'left' : 'right']: escala(36, larguraPx),
            width: 0,
            height: 0,
            borderLeft: `${escala(14, larguraPx)}px solid transparent`,
            borderRight: `${escala(14, larguraPx)}px solid transparent`,
            borderTop: `${escala(18, larguraPx)}px solid ${el.fundo}`,
          } as React.CSSProperties}
        />
      )}
    </div>
  );
}

function Sticker({ el, larguraPx }: { el: ElementoSticker; larguraPx: number }) {
  return (
    <div
      style={{ fontSize: escala(el.w * 9, larguraPx), lineHeight: 1 }}
      className="select-none"
    >
      {el.valor}
    </div>
  );
}

const MOLDURAS: Record<string, string> = {
  telemovel: 'rounded-[8%] border-[6px] border-white/90 shadow-2xl',
  polaroid:  'rounded-sm border-[10px] border-b-[36px] border-white shadow-xl',
  browser:   'rounded-lg border border-white/30 shadow-xl',
};

function Imagem({ el, larguraPx }: { el: ElementoImagem; larguraPx: number }) {
  const moldura = el.mockup && el.mockup !== 'nenhum' ? MOLDURAS[el.mockup] : '';
  return (
    <div className={`w-full h-full overflow-hidden ${moldura}`}
         style={{ borderRadius: moldura ? undefined : escala(el.raio, larguraPx) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={el.url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
    </div>
  );
}

function Forma({ el, larguraPx }: { el: ElementoForma; larguraPx: number }) {
  return (
    <div
      className="w-full h-full"
      style={{
        background: el.cor,
        opacity: el.opacidade / 100,
        borderRadius: escala(el.raio, larguraPx),
      }}
    />
  );
}
