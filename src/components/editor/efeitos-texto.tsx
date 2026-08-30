'use client';

import { PALETA_CORES } from './cores';
import { Seccao } from './seccao';
import type { Elemento, ElementoTexto } from '@/lib/types';

/**
 * Contorno e sombra nas letras.
 * São os dois efeitos que fazem o texto ler-se por cima de uma fotografia
 * sem precisar de faixa escura por trás.
 */
export function EfeitosTexto({
  el,
  p,
}: {
  el: ElementoTexto;
  p: (patch: Partial<Elemento>) => void;
}) {
  const contorno = el.contorno ?? { cor: '#141010', espessura: 0 };
  const sombra = el.sombra ?? { cor: 'rgba(0,0,0,0.45)', desfoque: 12, x: 0, y: 6 };
  const temContorno = (el.contorno?.espessura ?? 0) > 0;
  const temSombra = Boolean(el.sombra);

  return (
    <Seccao
      titulo="Efeitos"
      resumo={
        <span className="text-[11px] text-edSuave">
          {[temContorno && 'contorno', temSombra && 'sombra'].filter(Boolean).join(' · ') || 'nenhum'}
        </span>
      }
    >
      <div className="space-y-4">
        {/* ── contorno ─────────────────────────────── */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-xs text-edTexto">
            <input
              type="checkbox"
              checked={temContorno}
              onChange={(e) =>
                p({
                  contorno: e.target.checked
                    ? { cor: contorno.cor, espessura: 3 }
                    : { cor: contorno.cor, espessura: 0 },
                } as Partial<Elemento>)
              }
            />
            Contorno nas letras
          </label>

          {temContorno && (
            <>
              <p className="etiqueta">Espessura — {contorno.espessura}</p>
              <input
                type="range"
                min={1}
                max={16}
                value={contorno.espessura}
                onChange={(e) =>
                  p({
                    contorno: { ...contorno, espessura: +e.target.value },
                  } as Partial<Elemento>)
                }
                className="mb-2 w-full accent-brand"
              />
              <Bolinhas
                valor={contorno.cor}
                set={(cor) => p({ contorno: { ...contorno, cor } } as Partial<Elemento>)}
              />
            </>
          )}
        </div>

        {/* ── sombra ───────────────────────────────── */}
        <div className="border-t border-edLinha pt-3">
          <label className="mb-2 flex items-center gap-2 text-xs text-edTexto">
            <input
              type="checkbox"
              checked={temSombra}
              onChange={(e) =>
                p({ sombra: e.target.checked ? sombra : undefined } as Partial<Elemento>)
              }
            />
            Sombra
          </label>

          {temSombra && (
            <>
              <p className="etiqueta">Desfoque — {sombra.desfoque}</p>
              <input
                type="range"
                min={0}
                max={60}
                value={sombra.desfoque}
                onChange={(e) =>
                  p({ sombra: { ...sombra, desfoque: +e.target.value } } as Partial<Elemento>)
                }
                className="mb-2 w-full accent-brand"
              />
              <div className="mb-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="etiqueta">Deslocar →</p>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={sombra.x}
                    onChange={(e) =>
                      p({ sombra: { ...sombra, x: +e.target.value } } as Partial<Elemento>)
                    }
                    className="w-full accent-brand"
                  />
                </div>
                <div>
                  <p className="etiqueta">Deslocar ↓</p>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={sombra.y}
                    onChange={(e) =>
                      p({ sombra: { ...sombra, y: +e.target.value } } as Partial<Elemento>)
                    }
                    className="w-full accent-brand"
                  />
                </div>
              </div>
              <Bolinhas
                valor={sombra.cor}
                set={(cor) => p({ sombra: { ...sombra, cor } } as Partial<Elemento>)}
              />
            </>
          )}
        </div>
      </div>
    </Seccao>
  );
}

function Bolinhas({ valor, set }: { valor: string; set: (c: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {PALETA_CORES.slice(0, 14).map((c) => (
        <button
          key={c}
          onClick={() => set(c)}
          style={{ background: c }}
          className={`aspect-square w-full rounded-full transition ${
            valor === c ? 'ring-2 ring-rosa ring-offset-1 ring-offset-edFundo' : 'ring-1 ring-white/15'
          }`}
        />
      ))}
    </div>
  );
}
