'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Type, MessageSquare, Smile, Image as ImageIcon, Square, Palette, Upload, Layers, LayoutTemplate,
} from 'lucide-react';
import { PaletaCores } from './cores';
import { EscolherFoto } from './escolher-foto';
import { useEditor } from '@/lib/editor-store';

const STICKERS = ['✨','🔥','🩷','👀','📌','⚡️','🎯','💬','✅','❌','☝️','🫶','😮','🤯','📈','🧠'];

type Aba = 'templates' | 'fundo' | 'texto' | 'balao' | 'sticker' | 'imagem' | 'forma';

export function BarraFerramentas({ userId }: { userId: string }) {
  const [aba, setAba] = useState<Aba>('templates');
  const { adicionar, patchSlide, patchTodosOsSlides, aplicarTemplate, slides, slideAtivo } = useEditor();
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; spec: any }>>([]);

  // os templates guardados, para vestir os slides com um clique
  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) =>
        setTemplates((d.templates ?? []).filter((t: any) => t.spec?.kind === 'editor')),
      );
  }, []);
  const slide = slides[slideAtivo];
  const inputFundo = useRef<HTMLInputElement>(null);
  const inputImagem = useRef<HTMLInputElement>(null);
  const [aSubir, setASubir] = useState(false);
  const [biblioteca, setBiblioteca] = useState<'fundo' | 'imagem' | null>(null);

  /** Carrega para a biblioteca de Fotografias e devolve id + url assinado. */
  async function subir(file: File): Promise<{ id: string; url: string }> {
    const form = new FormData();
    form.append('files', file);
    const res = await fetch('/api/photos', { method: 'POST', body: form });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const foto = data.photos?.[0];
    if (!foto?.url) throw new Error('Não consegui carregar a imagem.');
    return { id: foto.id, url: foto.url };
  }

  async function aoEscolherFundo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setASubir(true);
    try {
      const { id, url } = await subir(f);
      patchSlide({ fundoUrl: url, fundoFotoId: id });
    } finally {
      setASubir(false);
    }
  }

  async function aoEscolherImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setASubir(true);
    try {
      const { id, url } = await subir(f);
      adicionar({
        tipo: 'imagem',
        url,
        fotoId: id,
        x: 20,
        y: 25,
        w: 60,
        h: 40,
        rot: 0,
        raio: 24,
        mockup: 'nenhum',
      } as never);
    } finally {
      setASubir(false);
    }
  }

  function usarDaBiblioteca(foto: { id: string; url: string }) {
    if (biblioteca === 'fundo') {
      patchSlide({ fundoUrl: foto.url, fundoFotoId: foto.id });
    } else if (biblioteca === 'imagem') {
      adicionar({
        tipo: 'imagem',
        url: foto.url,
        fotoId: foto.id,
        x: 20,
        y: 25,
        w: 60,
        h: 40,
        rot: 0,
        raio: 24,
        mockup: 'nenhum',
      } as never);
    }
    setBiblioteca(null);
  }

  const ABAS: { id: Aba; label: string; icone: any }[] = [
    { id: 'templates', label: 'Templates', icone: LayoutTemplate },
    { id: 'fundo',   label: 'Fundo',    icone: Palette },
    { id: 'texto',   label: 'Texto',    icone: Type },
    { id: 'balao',   label: 'Balões',   icone: MessageSquare },
    { id: 'imagem',  label: 'Imagem',   icone: ImageIcon },
    { id: 'sticker', label: 'Stickers', icone: Smile },
    { id: 'forma',   label: 'Formas',   icone: Square },
  ];

  return (
    <div className="w-64 shrink-0 border-r border-edLinha bg-edSuperficie/30 flex flex-col">
      <div className="grid grid-cols-3 gap-1 p-2 border-b border-edLinha">
        {ABAS.map(({ id, label, icone: Icone }) => (
          <button key={id} onClick={() => setAba(id)}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] transition ${
              aba === id ? 'bg-brand/15 text-brand-soft' : 'text-edSuave hover:text-white'
            }`}>
            <Icone className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 overflow-y-auto text-sm space-y-4">
        {aba === 'templates' && (
          <>
            <p className="text-xs leading-relaxed text-edSuave">
              Escolhe um template e os slides vestem-no todos. O teu texto fica; muda o
              desenho — posições, letras, cores. A fotografia de cada slide também fica.
            </p>
            {templates.length === 0 && (
              <p className="text-xs text-edSuave">
                Ainda não guardaste templates. Desenha um e carrega em “Criar template”.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => {
                const molde = t.spec?.slides?.[0];
                if (!molde) return null;
                return (
                  <button
                    key={t.id}
                    onClick={() => aplicarTemplate(molde)}
                    className="overflow-hidden rounded-xl border border-edLinha transition hover:border-rosa"
                    title={`Aplicar ${t.name}`}
                  >
                    <div
                      className="relative"
                      style={{ background: molde.fundoCor, aspectRatio: '3 / 4' }}
                    >
                      {molde.elementos
                        ?.filter((e: any) => e.tipo === 'texto' || e.tipo === 'balao')
                        .slice(0, 3)
                        .map((e: any) => (
                          <span
                            key={e.id}
                            className="absolute truncate text-[6px] leading-tight"
                            style={{
                              left: `${e.x}%`,
                              top: `${e.y}%`,
                              width: `${e.w}%`,
                              color: e.cor,
                              background: e.fundo === 'transparent' ? undefined : e.fundo,
                              textAlign: e.alinhamento,
                            }}
                          >
                            {e.texto}
                          </span>
                        ))}
                    </div>
                    <span className="block truncate px-2 py-1.5 text-[11px] text-edSuave">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {aba === 'fundo' && (
          <>
            <PaletaCores
              label="Cor de fundo"
              valor={slide.fundoCor}
              comTransparente={false}
              set={(c) => patchSlide({ fundoCor: c, fundoUrl: undefined })}
            />

            <div>
              <p className="etiqueta">Imagem de fundo</p>
              <button
                onClick={() => setBiblioteca('fundo')}
                className="btn-secundario mb-2 w-full text-xs"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Biblioteca de fotos
              </button>
              <button onClick={() => inputFundo.current?.click()} className="btn-secundario w-full text-xs">
                <Upload className="w-3.5 h-3.5" /> {aSubir ? 'A subir…' : 'Carregar do computador'}
              </button>
              <input ref={inputFundo} type="file" accept="image/*" hidden onChange={aoEscolherFundo} />
              {slide.fundoUrl && (
                <button onClick={() => patchSlide({ fundoUrl: undefined })}
                        className="btn-fantasma w-full text-xs mt-1">Remover</button>
              )}
            </div>

            <div>
              <p className="etiqueta">Escurecer fundo — {slide.fundoEscurecer}%</p>
              <input type="range" min={0} max={90} value={slide.fundoEscurecer}
                     onChange={(e) => patchSlide({ fundoEscurecer: +e.target.value })}
                     className="w-full accent-brand" />
            </div>

            {slides.length > 1 && (
              <button
                onClick={() =>
                  patchTodosOsSlides({
                    fundoCor: slide.fundoCor,
                    fundoUrl: slide.fundoUrl,
                    fundoFotoId: slide.fundoFotoId,
                    fundoEscurecer: slide.fundoEscurecer,
                  })
                }
                className="btn-secundario w-full text-xs"
                title="A cor, a imagem e o véu deste slide passam para os outros todos."
              >
                <Layers className="w-3.5 h-3.5" /> Aplicar a todos os {slides.length} slides
              </button>
            )}
          </>
        )}

        {aba === 'texto' && (
          <div className="space-y-2">
            <BotaoAdicionar label="Título grande" onClick={() =>
              adicionar({ tipo: 'texto', fonte: 'Poppins', texto: 'O teu título aqui', x: 8, y: 12, w: 84, h: 20, rot: 0,
                cor: '#141010', fundo: 'transparent', tamanho: 96, peso: 800,
                alinhamento: 'left', raio: 0 } as any)} />
            <BotaoAdicionar label="Subtítulo" onClick={() =>
              adicionar({ tipo: 'texto', fonte: 'Poppins', texto: 'Uma linha de apoio', x: 8, y: 40, w: 80, h: 12, rot: 0,
                cor: '#141010', fundo: 'transparent', tamanho: 52, peso: 600,
                alinhamento: 'left', raio: 0 } as any)} />
            <BotaoAdicionar label="Parágrafo" onClick={() =>
              adicionar({ tipo: 'texto', fonte: 'Poppins', texto: 'Escreve aqui o corpo do slide. Frases curtas funcionam melhor.',
                x: 8, y: 58, w: 80, h: 20, rot: 0, cor: '#141010', fundo: 'transparent',
                tamanho: 36, peso: 400, alinhamento: 'left', raio: 0 } as any)} />
          </div>
        )}

        {aba === 'balao' && (
          <div className="space-y-2">
            <BotaoAdicionar label="Balão branco" onClick={() =>
              adicionar({ tipo: 'balao', fonte: 'Poppins', texto: 'Isto muda tudo.', x: 10, y: 30, w: 70, h: 15, rot: 0,
                cor: '#141010', fundo: '#FDF7E4', tamanho: 44, peso: 600,
                alinhamento: 'left', raio: 32, bico: 'esq' } as any)} />
            <BotaoAdicionar label="Balão roxo" onClick={() =>
              adicionar({ tipo: 'balao', fonte: 'Poppins', texto: 'Guarda este post.', x: 12, y: 50, w: 65, h: 14, rot: -3,
                cor: '#FFFFFF', fundo: '#EE4E8B', tamanho: 44, peso: 700,
                alinhamento: 'center', raio: 32, bico: 'dir' } as any)} />
            <BotaoAdicionar label="Etiqueta destaque" onClick={() =>
              adicionar({ tipo: 'balao', fonte: 'Poppins', texto: 'NOVO', x: 8, y: 8, w: 26, h: 8, rot: -6,
                cor: '#141010', fundo: '#F7E3A0', tamanho: 40, peso: 800,
                alinhamento: 'center', raio: 999, bico: 'nenhum' } as any)} />
          </div>
        )}

        {aba === 'imagem' && (
          <>
            <button onClick={() => inputImagem.current?.click()} className="btn-secundario w-full text-xs">
              <Upload className="w-3.5 h-3.5" /> {aSubir ? 'A subir…' : 'Carregar imagem'}
            </button>
            <input ref={inputImagem} type="file" accept="image/*" hidden onChange={aoEscolherImagem} />
            <p className="text-xs text-edSuave leading-relaxed">
              Depois de inserir, escolhe uma moldura (telemóvel, polaroid ou browser) no painel da direita.
            </p>
          </>
        )}

        {aba === 'sticker' && (
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map((s) => (
              <button key={s} onClick={() =>
                adicionar({ tipo: 'sticker', valor: s, x: 40, y: 40, w: 14, h: 14, rot: 0 } as any)}
                className="h-11 rounded-lg border border-edLinha hover:border-brand/60 text-xl">
                {s}
              </button>
            ))}
          </div>
        )}

        {aba === 'forma' && (
          <div className="space-y-2">
            <BotaoAdicionar label="Retângulo" onClick={() =>
              adicionar({ tipo: 'forma', cor: '#EE4E8B', x: 10, y: 60, w: 80, h: 20, rot: 0,
                raio: 24, opacidade: 100 } as any)} />
            <BotaoAdicionar label="Faixa translúcida" onClick={() =>
              adicionar({ tipo: 'forma', cor: '#000000', x: 0, y: 55, w: 100, h: 45, rot: 0,
                raio: 0, opacidade: 55 } as any)} />
            <BotaoAdicionar label="Círculo" onClick={() =>
              adicionar({ tipo: 'forma', cor: '#F7E3A0', x: 35, y: 35, w: 30, h: 22, rot: 0,
                raio: 999, opacidade: 100 } as any)} />
          </div>
        )}
      </div>

      {biblioteca && (
        <EscolherFoto aoEscolher={usarDaBiblioteca} aoFechar={() => setBiblioteca(null)} />
      )}

    </div>
  );
}

function BotaoAdicionar({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-xl border border-edLinha
                 hover:border-brand/60 hover:bg-edSuperficie transition text-xs">
      + {label}
    </button>
  );
}
