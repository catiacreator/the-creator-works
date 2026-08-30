'use client';

import { X, Images, Image as ImageIcon } from 'lucide-react';
import { SlidePreview } from './preview';
import {
  CORES_CAIXA,
  CORES_FUNDO,
  FONTES,
  type Estilo,
} from '@/lib/studio-estilos';

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="label mb-2">{label}</div>
      {children}
    </div>
  );
}

/**
 * Criar ou afinar um estilo — tudo o que decide o aspeto de um slide.
 * A pré-visualização mostra o slide a sério, com a fotografia que ele vai
 * levar: um estilo escolhido sobre fundo preto e depois usado sobre uma
 * fotografia não é o mesmo estilo.
 */
export function EditorDeEstilo({
  rascunho,
  setRascunho,
  aoFechar,
  aoGuardar,
  foto,
  texto,
  handle,
  aoEscolherFoto,
  aoCarregarFoto,
  aoTirarFoto,
}: {
  rascunho: Estilo;
  setRascunho: (e: Estilo) => void;
  aoFechar: () => void;
  aoGuardar: () => void;
  /** a fotografia que este carrossel já tem, para a pré-visualização ser real */
  foto?: string | null;
  /** o texto do primeiro slide, pelo mesmo motivo */
  texto?: string;
  handle?: string;
  aoEscolherFoto?: () => void;
  aoCarregarFoto?: (f: File) => void;
  aoTirarFoto?: () => void;
}) {
  const set = (p: Partial<Estilo>) => setRascunho({ ...rascunho, ...p });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-6 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <div className="card my-6 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Estilo</h2>
          <button
            onClick={aoFechar}
            className="ml-auto rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_220px]">
          <div>
            <Campo label="Nome">
              <input
                className="input"
                value={rascunho.nome}
                onChange={(e) => set({ nome: e.target.value })}
              />
            </Campo>

            <Campo label="Cor de fundo">
              <div className="flex flex-wrap items-center gap-2">
                {CORES_FUNDO.map((c) => (
                  <button
                    key={c}
                    onClick={() => set({ corFundo: c })}
                    aria-label={`Fundo ${c}`}
                    className={`h-9 w-9 rounded-xl border-2 ${
                      rascunho.corFundo === c ? 'border-ink' : 'border-sand'
                    }`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={rascunho.corFundo}
                  onChange={(e) => set({ corFundo: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-xl border border-sand bg-transparent"
                  aria-label="Outra cor de fundo"
                />
              </div>
            </Campo>

            <Campo label="Cor da caixa de texto">
              <div className="flex flex-wrap items-center gap-2">
                {CORES_CAIXA.map((c) => (
                  <button
                    key={c}
                    onClick={() => set({ corCaixa: c, opacidadeCaixa: rascunho.opacidadeCaixa || 100 })}
                    aria-label={`Caixa ${c}`}
                    className={`h-9 w-9 rounded-xl border-2 ${
                      rascunho.corCaixa === c ? 'border-ink' : 'border-sand'
                    }`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={rascunho.corCaixa}
                  onChange={(e) => set({ corCaixa: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-xl border border-sand bg-transparent"
                  aria-label="Outra cor de caixa"
                />
                <button
                  onClick={() => set({ opacidadeCaixa: 0 })}
                  className={rascunho.opacidadeCaixa === 0 ? 'chip-on' : 'chip-off'}
                >
                  Sem caixa
                </button>
              </div>
            </Campo>

            <Campo label={`Transparência da caixa — ${rascunho.opacidadeCaixa}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={rascunho.opacidadeCaixa}
                onChange={(e) => set({ opacidadeCaixa: Number(e.target.value) })}
                className="w-full accent-rosa"
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Tipo de letra">
                <select
                  className="input"
                  value={rascunho.fonte}
                  onChange={(e) => set({ fonte: e.target.value })}
                >
                  {FONTES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label={`Tamanho — ${rascunho.tamanho}`}>
                <input
                  type="range"
                  min={10}
                  max={44}
                  value={rascunho.tamanho}
                  onChange={(e) => set({ tamanho: Number(e.target.value) })}
                  className="w-full accent-rosa"
                />
              </Campo>
            </div>

            <Campo label={`Onde fica a caixa — ${rascunho.caixaY}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={rascunho.caixaY}
                onChange={(e) => set({ caixaY: Number(e.target.value) })}
                className="w-full accent-rosa"
              />
              <div className="mt-1 flex justify-between text-[11px] text-muted">
                <span>Topo</span>
                <span>Centro</span>
                <span>Fundo</span>
              </div>
            </Campo>

            <Campo label="Tamanho da caixa">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rascunho.caixaFixa}
                  onChange={(e) => set({ caixaFixa: e.target.checked })}
                  className="h-4 w-4 accent-rosa"
                />
                Fixar — não cresce com o texto
              </label>

              {rascunho.caixaFixa && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs text-muted">Largura — {rascunho.caixaLargura}%</div>
                    <input
                      type="range"
                      min={30}
                      max={100}
                      value={rascunho.caixaLargura}
                      onChange={(e) => set({ caixaLargura: Number(e.target.value) })}
                      className="w-full accent-rosa"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted">Altura — {rascunho.caixaAltura}%</div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={rascunho.caixaAltura}
                      onChange={(e) => set({ caixaAltura: Number(e.target.value) })}
                      className="w-full accent-rosa"
                    />
                  </div>
                </div>
              )}
            </Campo>

            <Campo label={`Cantos — ${rascunho.raio}px`}>
              <input
                type="range"
                min={0}
                max={40}
                value={rascunho.raio}
                onChange={(e) => set({ raio: Number(e.target.value) })}
                className="w-full accent-rosa"
              />
            </Campo>
          </div>

          <div>
            <div className="label mb-2">Como fica</div>
            <SlidePreview
              estilo={rascunho}
              foto={foto}
              texto={texto || 'O gancho que trava o scroll vive aqui, e é ele que decide tudo.'}
              handle={handle}
            />

            {(aoEscolherFoto || aoCarregarFoto) && (
              <div className="mt-3 space-y-1.5">
                {aoEscolherFoto && (
                  <button className="btn-ghost w-full !py-2 text-xs" onClick={aoEscolherFoto}>
                    <Images className="h-3.5 w-3.5" /> {foto ? 'Trocar a fotografia' : 'Escolher fotografia'}
                  </button>
                )}
                {aoCarregarFoto && (
                  <label className="btn-ghost w-full cursor-pointer !py-2 text-xs">
                    <ImageIcon className="h-3.5 w-3.5" /> Do computador
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) aoCarregarFoto(f);
                      }}
                    />
                  </label>
                )}
                {foto && aoTirarFoto && (
                  <button className="w-full text-xs text-muted underline" onClick={aoTirarFoto}>
                    ver sem fotografia
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-sand pt-4">
          <button className="btn-ghost" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn-primary ml-auto" onClick={aoGuardar}>
            Guardar estilo
          </button>
        </div>
      </div>
    </div>
  );
}
