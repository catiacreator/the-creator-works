'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { useEditor } from '@/lib/editor-store';
import { FORMATOS } from '@/lib/types';
import { ElementoVista } from './elemento-vista';

export const ID_CANVAS = 'canvas-exportavel';

const MIN = 0.2;
const MAX = 4;
const REGUA = 24; // espessura das réguas
const AR = 40; // ar à volta da folha

export function Canvas() {
  const { slides, slideAtivo, formato, selecionar, guias } = useEditor();
  const slide = slides[slideAtivo];

  const contentor = useRef<HTMLDivElement>(null);
  const folha = useRef<HTMLDivElement>(null);

  /** largura da folha a encaixar no espaço disponível */
  const [base, setBase] = useState(400);
  /** 1 = encaixada */
  const [zoom, setZoom] = useState(1);
  /** onde começa a folha, visto da régua — é o zero */
  const [origem, setOrigem] = useState({ x: 0, y: 0 });

  const { w, h } = FORMATOS[formato];

  const medir = useCallback(() => {
    const cx = contentor.current;
    if (!cx) return;
    const dispW = cx.clientWidth - REGUA - AR * 2;
    const dispH = cx.clientHeight - REGUA - AR * 2;
    setBase(Math.max(120, Math.min(dispW, (dispH * w) / h)));
  }, [w, h]);

  const alinharReguas = useCallback(() => {
    const cx = contentor.current;
    const fl = folha.current;
    if (!cx || !fl) return;
    const rc = cx.getBoundingClientRect();
    const rf = fl.getBoundingClientRect();
    setOrigem({ x: rf.left - rc.left - REGUA, y: rf.top - rc.top - REGUA });
  }, []);

  useEffect(() => {
    if (!contentor.current) return;
    const obs = new ResizeObserver(() => {
      medir();
      alinharReguas();
    });
    obs.observe(contentor.current);
    medir();
    return () => obs.disconnect();
  }, [medir, alinharReguas]);

  useLayoutEffect(alinharReguas, [alinharReguas, base, zoom, formato, slideAtivo]);

  // ⌘ + roda do rato faz zoom, como em qualquer editor
  useEffect(() => {
    const cx = contentor.current;
    if (!cx) return;
    const aoRodar = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(MAX, Math.max(MIN, z * (e.deltaY > 0 ? 0.92 : 1.08))));
    };
    cx.addEventListener('wheel', aoRodar, { passive: false });
    return () => cx.removeEventListener('wheel', aoRodar);
  }, []);

  if (!slide) return null;

  const larguraPx = base * zoom;
  const alturaPx = (larguraPx * h) / w;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {/* ── a área de trabalho ───────────────────────── */}
      <div
        ref={contentor}
        onScroll={alinharReguas}
        className="tela-pontilhada absolute inset-0 overflow-auto"
        style={{ paddingTop: REGUA, paddingLeft: REGUA }}
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center"
          style={{ padding: AR }}
        >
          <div
            ref={folha}
            id={ID_CANVAS}
            onPointerDown={() => selecionar(null)}
            style={{
              width: larguraPx,
              height: alturaPx,
              background: slide.fundoCor,
              position: 'relative',
              overflow: 'hidden',
            }}
            className="shrink-0 rounded-sm shadow-[0_20px_60px_-12px_rgba(0,0,0,.45)] ring-1 ring-black/20"
          >
            {slide.fundoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.fundoUrl}
                alt=""
                crossOrigin="anonymous"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {slide.fundoEscurecer > 0 && (
              <div
                className="absolute inset-0"
                style={{ background: `rgba(0,0,0,${slide.fundoEscurecer / 100})` }}
              />
            )}

            {[...slide.elementos]
              .sort((a, b) => a.z - b.z)
              .map((el) => (
                <ElementoVista key={el.id} el={el} larguraPx={larguraPx} editavel />
              ))}

            {/* linhas de centragem — só enquanto arrastas */}
            {guias.v && (
              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-50 w-px -translate-x-1/2 bg-rosa" />
            )}
            {guias.h && (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 z-50 h-px -translate-y-1/2 bg-rosa" />
            )}
          </div>
        </div>
      </div>

      {/* ── réguas, presas ao canvas ─────────────────── */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-20 border-b border-r border-edLinha bg-edSuperficie"
        style={{ width: REGUA, height: REGUA }}
      />
      <Regua
        horizontal
        origem={origem.x}
        tamanhoPx={larguraPx}
        total={w}
      />
      <Regua origem={origem.y} tamanhoPx={alturaPx} total={h} />

      {/* ── zoom ─────────────────────────────────────── */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 rounded-full border border-edLinha bg-edSuperficie/95 p-1 shadow-lg backdrop-blur">
        <button
          className="rounded-full p-1.5 text-edSuave transition hover:bg-edFundo hover:text-edTexto"
          onClick={() => setZoom((z) => Math.max(MIN, z - 0.15))}
          title="Afastar"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          className="min-w-[52px] rounded-full px-2 text-[11px] tabular-nums text-edSuave transition hover:text-edTexto"
          onClick={() => setZoom(1)}
          title="Voltar a encaixar"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          className="rounded-full p-1.5 text-edSuave transition hover:bg-edFundo hover:text-edTexto"
          onClick={() => setZoom((z) => Math.min(MAX, z + 0.15))}
          title="Aproximar"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="h-4 w-px bg-edLinha" />
        <button
          className="rounded-full p-1.5 text-edSuave transition hover:bg-edFundo hover:text-edTexto"
          onClick={() => setZoom(1)}
          title="Encaixar no ecrã"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Régua presa ao canvas. O zero fica onde a folha começa, e as marcas contam
 * em píxeis do slide (0 a 1080 na horizontal, 0 a 1440 na vertical).
 */
function Regua({
  horizontal = false,
  origem,
  tamanhoPx,
  total,
}: {
  horizontal?: boolean;
  origem: number;
  tamanhoPx: number;
  total: number;
}) {
  const passo = 100;
  const marcas: number[] = [];
  for (let v = 0; v <= total; v += passo) marcas.push(v);

  return (
    <div
      className={`pointer-events-none absolute z-20 overflow-hidden bg-edSuperficie text-edSuave ${
        horizontal
          ? 'left-0 right-0 top-0 border-b border-edLinha'
          : 'bottom-0 left-0 top-0 border-r border-edLinha'
      }`}
      style={
        horizontal
          ? { height: REGUA, paddingLeft: REGUA }
          : { width: REGUA, paddingTop: REGUA }
      }
    >
      <div className="relative h-full w-full">
        {marcas.map((v) => {
          const pos = origem + (v / total) * tamanhoPx;
          const grande = v % (passo * 2) === 0;
          return (
            <div key={v}>
              <span
                className="absolute bg-edLinha"
                style={
                  horizontal
                    ? { left: pos, bottom: 0, width: 1, height: grande ? 10 : 5 }
                    : { top: pos, right: 0, height: 1, width: grande ? 10 : 5 }
                }
              />
              {grande && (
                <span
                  className="absolute text-[9px] leading-none tabular-nums"
                  style={
                    horizontal ? { left: pos + 3, top: 4 } : { top: pos + 3, left: 3 }
                  }
                >
                  {v}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
