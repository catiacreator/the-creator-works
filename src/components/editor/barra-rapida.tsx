'use client';

import { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CaseUpper,
  Copy,
  Lock,
  Unlock,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Minus,
  Plus,
} from 'lucide-react';
import { useEditor } from '@/lib/editor-store';
import { GRUPOS } from '@/lib/fontes-editor';
import { useFontesDela } from '@/lib/usar-fontes';
import { Upload } from 'lucide-react';
import { PALETA_CORES } from './cores';
import type { Elemento, ElementoTexto } from '@/lib/types';

/**
 * A barra que aparece por cima da tela quando há algo selecionado.
 * Traz o que se mexe a toda a hora — letra, tamanho, cor, alinhamento —
 * para não teres de ir ao painel da direita a cada ajuste.
 */
export function BarraRapida() {
  const { slides, slideAtivo, selecionado, patchElemento, duplicarElemento, apagarElemento, trazerFrente, enviarTras } =
    useEditor();
  const [aberto, setAberto] = useState<'fonte' | 'cor' | null>(null);
  const [aSubir, setASubir] = useState(false);
  const ficheiro = useRef<HTMLInputElement>(null);
  const { todas, recarregar } = useFontesDela();

  async function carregarFonte(f: File) {
    setASubir(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const d = await fetch('/api/fontes', { method: 'POST', body: form }).then((r) => r.json());
      if (d.error) return alert(d.error);
      await recarregar();
      patchElemento(selecionado!, { fonte: d.fonte.name } as Partial<Elemento>);
    } finally {
      setASubir(false);
    }
  }

  const el = slides[slideAtivo]?.elementos.find((e) => e.id === selecionado);
  if (!el) return null;

  const p = (patch: Partial<Elemento>) => patchElemento(el.id, patch);
  const texto = el.tipo === 'texto' || el.tipo === 'balao' ? (el as ElementoTexto) : null;
  const fonteAtual = todas.find((f) => f.valor === (texto?.fonte ?? 'Poppins'));

  const btn =
    'rounded-lg p-1.5 text-edSuave transition hover:bg-edFundo hover:text-edTexto disabled:opacity-40';
  const btnOn = 'rounded-lg p-1.5 bg-rosa/15 text-rosa ring-1 ring-rosa/40';

  return (
    <div className="relative z-30 flex flex-wrap items-center gap-1 border-b border-edLinha bg-edSuperficie/80 px-3 py-1.5 backdrop-blur">
      {texto && (
        <>
          {/* tipo de letra */}
          <div className="relative">
            <button
              onClick={() => setAberto(aberto === 'fonte' ? null : 'fonte')}
              className="flex min-w-[130px] items-center gap-1.5 rounded-lg border border-edLinha px-2.5 py-1 text-left text-xs text-edTexto transition hover:border-rosa/50"
              style={{ fontFamily: fonteAtual?.css }}
            >
              <span className="truncate">{fonteAtual?.nome ?? 'Poppins'}</span>
              <ChevronDown className="ml-auto h-3 w-3 shrink-0 opacity-60" />
            </button>
            {aberto === 'fonte' && (
              <div className="cartao absolute left-0 top-full z-50 mt-1 w-60 p-2">
                {/* carregar uma fonte tua — fixo no topo, sempre à mão */}
                <button
                  onClick={() => ficheiro.current?.click()}
                  disabled={aSubir}
                  className="mb-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-edLinha px-3 py-2 text-xs text-edSuave transition hover:border-rosa hover:text-edTexto"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {aSubir ? 'A carregar…' : 'Carregar a minha fonte'}
                </button>
                <input
                  ref={ficheiro}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  hidden
                  onChange={(e) => e.target.files?.[0] && carregarFonte(e.target.files[0])}
                />

                <div className="max-h-72 overflow-y-auto">
                {['Tuas', ...GRUPOS.filter((g) => g !== 'Tuas')].map((grupo) => {
                  const doGrupo = todas.filter((f) => f.grupo === grupo);
                  if (!doGrupo.length) return null;
                  return (
                  <div key={grupo} className="mb-2">
                    <p className="mb-1 px-1 text-[10px] uppercase tracking-wider text-edSuave/70">
                      {grupo}
                    </p>
                    {doGrupo.map((f) => (
                      <button
                        key={f.valor}
                        onClick={() => {
                          p({ fonte: f.valor } as Partial<Elemento>);
                          setAberto(null);
                        }}
                        style={{ fontFamily: f.css }}
                        className={`block w-full rounded-lg px-2 py-1.5 text-left text-[15px] transition ${
                          texto.fonte === f.valor
                            ? 'bg-rosa/15 text-edTexto'
                            : 'text-edSuave hover:bg-edFundo hover:text-edTexto'
                        }`}
                      >
                        {f.nome}
                      </button>
                    ))}
                  </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>

          {/* tamanho */}
          <div className="flex items-center rounded-lg border border-edLinha">
            <button
              className="px-1.5 py-1 text-edSuave hover:text-edTexto"
              onClick={() => p({ tamanho: Math.max(12, texto.tamanho - 4) } as Partial<Elemento>)}
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              value={texto.tamanho}
              onChange={(e) =>
                p({ tamanho: Math.max(8, Number(e.target.value) || 8) } as Partial<Elemento>)
              }
              className="w-9 bg-transparent text-center text-xs tabular-nums text-edTexto outline-none"
            />
            <button
              className="px-1.5 py-1 text-edSuave hover:text-edTexto"
              onClick={() => p({ tamanho: texto.tamanho + 4 } as Partial<Elemento>)}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* cor */}
          <div className="relative">
            <button
              onClick={() => setAberto(aberto === 'cor' ? null : 'cor')}
              className="flex items-center gap-1 rounded-lg border border-edLinha px-1.5 py-1"
              title="Cor do texto"
            >
              <span
                className="h-4 w-4 rounded-full ring-1 ring-white/25"
                style={{ background: texto.cor }}
              />
              <ChevronDown className="h-3 w-3 text-edSuave" />
            </button>
            {aberto === 'cor' && (
              <div className="cartao absolute left-0 top-full z-50 mt-1 w-56 p-3">
                <div className="grid grid-cols-7 gap-1.5">
                  {PALETA_CORES.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        p({ cor: c } as Partial<Elemento>);
                        setAberto(null);
                      }}
                      style={{ background: c }}
                      className="aspect-square w-full rounded-full ring-1 ring-white/15 transition hover:ring-white/50"
                    />
                  ))}
                  <label
                    className="relative aspect-square w-full cursor-pointer rounded-full ring-1 ring-white/25"
                    style={{
                      background:
                        'conic-gradient(#e63329,#f5d33b,#4fc46a,#2f7df6,#8b5cf6,#ee4e8b,#e63329)',
                    }}
                  >
                    <input
                      type="color"
                      onChange={(e) => p({ cor: e.target.value } as Partial<Elemento>)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <span className="mx-1 h-5 w-px bg-edLinha" />

          <button
            className={texto.peso >= 700 ? btnOn : btn}
            onClick={() => p({ peso: texto.peso >= 700 ? 400 : 800 } as Partial<Elemento>)}
            title="Negrito"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            className={texto.italico ? btnOn : btn}
            onClick={() => p({ italico: !texto.italico } as Partial<Elemento>)}
            title="Itálico"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            className={texto.texto === texto.texto.toUpperCase() ? btnOn : btn}
            onClick={() =>
              p({
                texto:
                  texto.texto === texto.texto.toUpperCase()
                    ? texto.texto.toLowerCase()
                    : texto.texto.toUpperCase(),
              } as Partial<Elemento>)
            }
            title="MAIÚSCULAS"
          >
            <CaseUpper className="h-4 w-4" />
          </button>

          <span className="mx-1 h-5 w-px bg-edLinha" />

          {([
            ['left', AlignLeft],
            ['center', AlignCenter],
            ['right', AlignRight],
          ] as const).map(([valor, Icone]) => (
            <button
              key={valor}
              className={texto.alinhamento === valor ? btnOn : btn}
              onClick={() => p({ alinhamento: valor } as Partial<Elemento>)}
              title={valor === 'left' ? 'À esquerda' : valor === 'center' ? 'Ao centro' : 'À direita'}
            >
              <Icone className="h-4 w-4" />
            </button>
          ))}

          <span className="mx-1 h-5 w-px bg-edLinha" />
        </>
      )}

      {/* ações que servem a qualquer elemento */}
      <button className={btn} onClick={() => trazerFrente(el.id)} title="Trazer à frente">
        <ArrowUp className="h-4 w-4" />
      </button>
      <button className={btn} onClick={() => enviarTras(el.id)} title="Enviar para trás">
        <ArrowDown className="h-4 w-4" />
      </button>
      <button className={btn} onClick={() => duplicarElemento(el.id)} title="Duplicar">
        <Copy className="h-4 w-4" />
      </button>
      <button
        className={el.locked ? btnOn : btn}
        onClick={() => p({ locked: !el.locked } as Partial<Elemento>)}
        title={el.locked ? 'Desbloquear' : 'Bloquear'}
      >
        {el.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      </button>
      <button
        className="rounded-lg p-1.5 text-edSuave transition hover:bg-rosa/15 hover:text-rosa"
        onClick={() => apagarElemento(el.id)}
        title="Apagar"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
