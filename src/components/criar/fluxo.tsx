'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  Sparkles,
  FileText,
  Image as ImageIcon,
  PenTool,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Card, Spinner } from '@/components/ui';
import { GuiaDaPagina } from '@/components/guia';
import {
  Cartao,
  CartaoFormato,
  Familia,
  ICONES,
  Pergunta,
  Vitrine,
} from '@/components/criar/escolha';
import {
  FAMILIAS,
  OBJETIVOS,
  TIPOS,
  formatosDe,
  type Objetivo,
  type Tipo,
} from '@/lib/criar-opcoes';
import type { PhotoRow } from '@/lib/types';

interface Proposto {
  indice: number;
  titulo: string;
  texto: string;
  caracteres: number;
}

type Foto = PhotoRow & { url: string | null };
type Passo = 'tipo' | 'plano' | 'conteudo' | 'proposta';

/**
 * O fluxo de criar, em dois arranques.
 *
 * `inicio="tipo"` — o ecrã Criar: tipo → objetivo → formato, e daí para a
 * conversa com a Cát.IA, onde o tema se decide.
 * `inicio="documento"` — os Carrosséis Creator: um documento entra, a app diz
 * quantos carrosséis lá cabem, e saem todos compostos de uma vez.
 */
export function Fluxo({ inicio = 'tipo' }: { inicio?: 'tipo' | 'documento' }) {
  const router = useRouter();
  const soDocumento = inicio === 'documento';

  const [passo, setPasso] = useState<Passo>(soDocumento ? 'conteudo' : 'tipo');
  const [tipo, setTipo] = useState<Tipo | null>(soDocumento ? 'carrossel' : null);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [formato, setFormato] = useState<string | null>(null);

  const [texto, setTexto] = useState('');
  const [slides, setSlides] = useState(7);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [templateId, setTemplateId] = useState('');
  const [photos, setPhotos] = useState<Foto[]>([]);
  /** `{tipo}-{id}` → imagem de exemplo do formato, para quem já a tem */
  const [exemplos, setExemplos] = useState<Record<string, string>>({});

  const [propostos, setPropostos] = useState<Proposto[] | null>(null);
  const [origem, setOrigem] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Record<number, string>>({});
  const [escolhidos, setEscolhidos] = useState<Record<number, boolean>>({});
  const [aEscolherFoto, setAEscolherFoto] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [aTrabalhar, setATrabalhar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ficheiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [t, p] = await Promise.all([
        fetch('/api/templates').then((r) => r.json()),
        fetch('/api/photos').then((r) => r.json()),
      ]);
      setTemplates(t.templates ?? []);
      setPhotos(p.photos ?? []);
      if (t.templates?.length) setTemplateId(t.templates[0].id);
    })();
    fetch('/api/formatos-preview')
      .then((r) => r.json())
      .then((d) => setExemplos(d.imagens ?? {}))
      .catch(() => {});
  }, []);

  const formatos = tipo ? formatosDe(tipo) : [];
  /**
   * A vitrine dos Reels vem arrumada: primeiro os formatos de sempre, depois
   * as quatro famílias do catálogo. Carrossel e Stories são poucos — uma
   * grelha só.
   */
  const grupos = (() => {
    const semFamilia = formatos.filter((f) => !f.familia);
    const familias = Object.keys(FAMILIAS)
      .map((c) => ({
        chave: c,
        titulo: FAMILIAS[c],
        nota: undefined as string | undefined,
        formatos: formatos.filter((f) => f.familia === c),
      }))
      .filter((g) => g.formatos.length);
    if (!familias.length) return [{ chave: 'todos', titulo: '', nota: undefined, formatos }];
    return [
      { chave: 'base', titulo: 'Os do costume', nota: 'estrutura livre', formatos: semFamilia },
      ...familias,
    ];
  })();
  const oFormato = formatos.find((f) => f.id === formato);
  const oObjetivo = OBJETIVOS.find((o) => o.id === objetivo);
  const nomeDoTipo = TIPOS.find((t) => t.id === tipo)?.nome ?? '';
  /** "Reels · Crescimento · Série" — os stories não têm objetivo. */
  const etiqueta = [nomeDoTipo, oObjetivo?.nome, oFormato?.nome].filter(Boolean).join(' · ');
  /** Os stories não passam pelo objetivo: a estratégia já o traz lá dentro. */
  const pedeObjetivo = tipo !== 'stories';
  const escolhasFeitas = !!formato && (!pedeObjetivo || !!objetivo);

  function voltar() {
    setError(null);
    if (passo === 'proposta') return setPasso('conteudo');
    if (passo === 'conteudo') {
      if (soDocumento) return;
      return setPasso('plano');
    }
    if (passo === 'plano') {
      setTipo(null);
      setObjetivo(null);
      setFormato(null);
      return setPasso('tipo');
    }
  }

  /**
   * Reels e Stories saem em roteiro, numa conversa com a Cát.IA.
   * O tema não se pergunta aqui: as escolhas vão para a conversa e é lá que
   * ela reage ao formato e pergunta sobre o que vamos falar.
   */
  async function arrancar() {
    setBusy(true);
    setError(null);
    setATrabalhar('A abrir a conversa…');
    try {
      const oQue =
        tipo === 'reels'
          ? 'um Reels'
          : tipo === 'stories'
            ? 'uma sequência de Stories'
            : 'um carrossel';
      const pedido = [
        `Vamos fazer ${oQue}.`,
        oObjetivo && `Objetivo: ${oObjetivo.nome}. ${oObjetivo.instrucao}`,
        `Formato: ${oFormato?.nome}. ${oFormato?.comoSeEscreve}`,
        '',
        'Ainda não te dou o tema.',
      ]
        .filter(Boolean)
        .join('\n');

      const d = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: pedido, title: etiqueta }),
      }).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      router.push(`/chat?thread=${d.thread_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui abrir a conversa.');
      setBusy(false);
      setATrabalhar('');
    }
  }

  /** O carrossel passa pela divisão em pedaços antes de ser composto. */
  async function analisar(file?: File) {
    setBusy(true);
    setError(null);
    setATrabalhar(file ? 'A ler o documento…' : 'A preparar…');
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append('file', file);
        form.append('slides', String(slides));
        if (templateId) form.append('template_id', templateId);
        res = await fetch('/api/dividir', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/dividir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto, slides, template_id: templateId || null }),
        });
      }
      const d = await res.json();
      if (d.error) throw new Error(d.error);

      const lista: Proposto[] = d.carrosseis ?? [];
      setPropostos(lista);
      setEscolhidos(Object.fromEntries(lista.map((c) => [c.indice, c.caracteres >= 140])));
      setOrigem(d.origem ?? null);
      setPasso('proposta');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui ler isso.');
    } finally {
      setBusy(false);
      setATrabalhar('');
    }
  }

  async function criarCarrosseis() {
    const aCriar = (propostos ?? []).filter((c) => escolhidos[c.indice]);
    if (!aCriar.length) return;
    setBusy(true);
    setError(null);
    try {
      const extra = [
        oObjetivo && `Objetivo: ${oObjetivo.nome}. ${oObjetivo.instrucao}`,
        oFormato && `Formato: ${oFormato.nome}. ${oFormato.comoSeEscreve}`,
      ]
        .filter(Boolean)
        .join('\n');

      const criados: string[] = [];
      for (let i = 0; i < aCriar.length; i++) {
        setATrabalhar(`A criar ${i + 1} de ${aCriar.length}…`);
        const d = await fetch('/api/carousels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: aCriar[i].titulo,
            source_text: aCriar[i].texto,
            template_id: templateId || null,
            photo_id: fotos[aCriar[i].indice] || null,
            slides_per: slides,
            mode: 'ia',
            extra,
          }),
        }).then((r) => r.json());
        if (d.error) throw new Error(d.error);
        criados.push(d.carousel.id);
      }

      setATrabalhar('A compor as imagens…');
      for (let volta = 0; volta < 60; volta++) {
        const fila = await fetch('/api/jobs/run?limit=4', { method: 'POST' }).then((r) => r.json());
        if ((fila.remaining ?? 0) === 0 && (fila.processed ?? 0) === 0) break;
        setATrabalhar(`A compor as imagens… faltam ${fila.remaining ?? 0} passos`);
        await new Promise((r) => setTimeout(r, 900));
      }
      // um só carrossel abre logo; muitos vão para a lista
      router.push(criados.length === 1 ? `/carrosseis/${criados[0]}` : '/carrosseis');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui criar os carrosséis.');
      setBusy(false);
      setATrabalhar('');
    }
  }

  const fotoDe = (indice: number) => photos.find((p) => p.id === fotos[indice]) ?? null;

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <GuiaDaPagina />
      {passo !== 'tipo' && !(soDocumento && passo === 'conteudo') && (
        <button
          onClick={voltar}
          disabled={busy}
          className="mb-6 flex items-center gap-2 text-sm text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* ── 1. o que vamos criar ────────────────────── */}
      {passo === 'tipo' && (
        <>
          <Pergunta texto="O que vamos criar?" sub="Escolhe o tipo de conteúdo" />
          <div className="grid gap-4 sm:grid-cols-3">
            {TIPOS.map((t) => (
              <Cartao
                key={t.id}
                nome={t.nome}
                curto={t.curto}
                icone={ICONES[t.icone]}
                escolhido={tipo === t.id}
                onClick={() => {
                  setTipo(t.id);
                  setFormato(null);
                  setPasso('plano');
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* ── 2. objetivo e formato ───────────────────── */}
      {passo === 'plano' && tipo && (
        <>
          {pedeObjetivo && (
            <>
              <Pergunta
                texto="Qual é o objetivo?"
                sub={`O que queres que este ${nomeDoTipo} faça`}
              />
              <div className="mb-14 grid gap-4 sm:grid-cols-3">
                {OBJETIVOS.map((o) => (
                  <Cartao
                    key={o.id}
                    nome={o.nome}
                    curto={o.curto}
                    icone={ICONES[o.icone]}
                    escolhido={objetivo === o.id}
                    onClick={() => setObjetivo(o.id)}
                    detalhe={o.instrucao}
                  />
                ))}
              </div>
            </>
          )}

          <Pergunta
            texto={tipo === 'stories' ? 'Qual a estratégia?' : 'Qual o formato?'}
            sub={
              tipo === 'stories'
                ? 'A estratégia já traz o objetivo lá dentro'
                : `Como se conta este ${nomeDoTipo}`
            }
          />
          {grupos.map((g) => (
            <div key={g.chave}>
              {grupos.length > 1 && <Familia titulo={g.titulo} nota={g.nota} />}
              <Vitrine>
                {g.formatos.map((f) => (
                  <CartaoFormato
                    key={f.id}
                    tipo={tipo}
                    id={f.id}
                    nome={f.nome}
                    curto={f.curto}
                    detalhe={f.comoSeEscreve}
                    imagem={exemplos[`${tipo}-${f.id}`]}
                    escolhido={formato === f.id}
                    onClick={() => setFormato(f.id)}
                  />
                ))}
              </Vitrine>
            </div>
          ))}

          <div className="mt-10 text-center">
            <button
              className="btn-escuro px-8 py-4 text-base"
              disabled={!escolhasFeitas || busy}
              onClick={arrancar}
            >
              {busy ? (
                <Spinner label={aTrabalhar} />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {tipo === 'carrossel'
                    ? 'Gerar carrossel'
                    : tipo === 'reels'
                      ? 'Gerar Reels'
                      : 'Gerar sequência de Stories'}
                </>
              )}
            </button>
            {!escolhasFeitas && (
              <p className="mt-2 text-xs text-muted">
                {pedeObjetivo ? 'Escolhe um objetivo e um formato.' : 'Escolhe uma estratégia.'}
              </p>
            )}
            {escolhasFeitas && !busy && (
              <p className="mt-2 text-xs text-muted">
                {etiqueta} — o tema falamos lá dentro, com a Cát.IA.
              </p>
            )}

            {tipo === 'carrossel' && escolhasFeitas && !busy && (
              <p className="mt-5 text-sm text-muted">
                Ou, se já tens o assunto escrito num documento,{' '}
                <button className="underline hover:text-ink" onClick={() => setPasso('conteudo')}>
                  faz muitos carrosséis de uma vez
                </button>
                .
              </p>
            )}
          </div>
        </>
      )}

      {/* ── 3. o conteúdo ───────────────────────────── */}
      {passo === 'conteudo' && tipo && (
        <>
          <Pergunta
            texto={soDocumento ? 'O que vamos transformar?' : 'Sobre o que vamos falar?'}
            sub="Escreve a ideia ou carrega um documento — a app diz quantos carrosséis lá cabem"
          />

          <Card className="mb-5">
            <textarea
              className="input min-h-[150px] text-[15px]"
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O erro de publicar todos os dias · Porque é que ninguém guarda os teus posts · Como escrever um gancho que trava o scroll"
              disabled={busy}
            />

            {tipo === 'carrossel' && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-sand pt-4">
                <button
                  className="btn-ghost"
                  onClick={() => ficheiro.current?.click()}
                  disabled={busy}
                >
                  <Upload className="h-4 w-4" /> Carregar documento
                </button>
                <input
                  ref={ficheiro}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
                  hidden
                  onChange={(e) => e.target.files?.[0] && analisar(e.target.files[0])}
                />
                <span className="text-sm text-muted">PDF, Word, Excel, CSV ou texto.</span>
              </div>
            )}
          </Card>

          {tipo === 'carrossel' && (
            <div className="mb-6 grid gap-5 md:grid-cols-2">
              <Card>
                <label className="label">Slides por carrossel</label>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSlides(n)}
                      className={slides === n ? 'chip-on' : 'chip-off'}
                      disabled={busy}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </Card>

              <Card>
                <label className="label">Template</label>
                <select
                  className="input"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={busy}
                >
                  {templates.length === 0 && <option value="">— o template de origem —</option>}
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Link href="/editor" className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted underline">
                  <PenTool className="h-3 w-3" /> editar o template
                </Link>
              </Card>
            </div>
          )}

          <div className="text-center">
            <button
              className="btn-escuro px-8 py-4 text-base"
              disabled={busy || !texto.trim()}
              onClick={() => analisar()}
            >
              {busy ? (
                <Spinner label={aTrabalhar} />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Ver quantos carrosséis dá
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── 4. a proposta ───────────────────────────── */}
      {passo === 'proposta' && propostos && (
        <>
          <Card className="mb-4 border-ink/15 bg-creme">
            <div className="flex flex-wrap items-center gap-3">
              <FileText className="h-5 w-5 shrink-0" />
              <p className="text-sm">
                Dá para <strong>{propostos.length}</strong>{' '}
                {propostos.length === 1 ? 'carrossel' : 'carrosséis'}
                {origem && (
                  <>
                    {' '}
                    — de <strong>{origem}</strong>
                  </>
                )}
                , com {slides} slides cada.
              </p>
              <button
                className="btn-ghost ml-auto !py-1.5 text-xs"
                onClick={() => {
                  setPropostos(null);
                  setFotos({});
                  setPasso('conteudo');
                }}
                disabled={busy}
              >
                <X className="h-3.5 w-3.5" /> Recomeçar
              </button>
            </div>
          </Card>

          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-sand bg-superficie px-4 py-2.5 text-sm">
            <strong>
              {propostos.filter((c) => escolhidos[c.indice]).length} de {propostos.length} escolhidos
            </strong>
            <button
              className="inline-flex items-center gap-1.5 text-xs underline hover:text-rosa"
              onClick={() =>
                setEscolhidos(Object.fromEntries(propostos.map((c) => [c.indice, true])))
              }
            >
              <CheckSquare className="h-3.5 w-3.5" /> Selecionar todos
            </button>
            <button
              className="inline-flex items-center gap-1.5 text-xs underline hover:text-rosa"
              onClick={() => setEscolhidos({})}
            >
              <Square className="h-3.5 w-3.5" /> Limpar seleção
            </button>
            <span className="ml-auto text-xs text-muted">
              Os mais curtos vêm desmarcados — costumam ser só títulos.
            </span>
          </div>

          <div className="mb-5 space-y-3">
            {propostos.map((c) => {
              const on = !!escolhidos[c.indice];
              const foto = fotoDe(c.indice);
              return (
                <Card key={c.indice} className={on ? 'border-ink/25' : 'opacity-60'}>
                  <div className="flex gap-4">
                    <label className="flex shrink-0 items-start pt-1">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          setEscolhidos({ ...escolhidos, [c.indice]: e.target.checked })
                        }
                        className="h-4 w-4"
                        disabled={busy}
                      />
                    </label>

                    <button
                      onClick={() => setAEscolherFoto(c.indice)}
                      className={`w-24 shrink-0 overflow-hidden rounded-xl border-2 ${
                        foto ? 'border-ink' : 'border-dashed border-sand'
                      }`}
                      title="Escolher fotografia"
                      disabled={busy}
                    >
                      {foto?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={foto.url} alt="" className="aspect-[3/4] w-full object-cover" />
                      ) : (
                        <span className="flex aspect-[3/4] flex-col items-center justify-center gap-1 text-[11px] text-muted">
                          <ImageIcon className="h-4 w-4" />
                          foto
                        </span>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs uppercase tracking-wide text-muted">
                        Carrossel {c.indice + 1} · {c.caracteres.toLocaleString('pt-PT')} caracteres
                      </p>
                      <input
                        className="input mb-2 font-medium"
                        value={c.titulo}
                        onChange={(e) =>
                          setPropostos(
                            propostos.map((x) =>
                              x.indice === c.indice ? { ...x, titulo: e.target.value } : x,
                            ),
                          )
                        }
                        disabled={busy}
                      />
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted">{c.texto}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {(() => {
            const quantos = propostos.filter((c) => escolhidos[c.indice]).length;
            return (
              <button
                className="btn-escuro w-full py-4 text-base"
                onClick={criarCarrosseis}
                disabled={busy || quantos === 0}
              >
                {busy ? (
                  <Spinner label={aTrabalhar} />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {quantos === 0
                      ? 'Escolhe pelo menos um'
                      : `Gerar ${quantos} ${quantos === 1 ? 'carrossel' : 'carrosséis'}`}
                  </>
                )}
              </button>
            );
          })()}
        </>
      )}

      {/* ── escolher fotografia ─────────────────────── */}
      {aEscolherFoto !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm"
          onClick={() => setAEscolherFoto(null)}
        >
          <div className="card w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-lg font-semibold">
              Fotografia do carrossel {aEscolherFoto + 1}
            </h2>
            <div className="grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto md:grid-cols-6">
              <button
                onClick={() => {
                  setFotos((f) => {
                    const novo = { ...f };
                    delete novo[aEscolherFoto];
                    return novo;
                  });
                  setAEscolherFoto(null);
                }}
                className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-sand text-[11px] text-muted"
              >
                sem foto
              </button>
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setFotos((f) => ({ ...f, [aEscolherFoto]: p.id }));
                    setAEscolherFoto(null);
                  }}
                  className={`overflow-hidden rounded-xl border-2 ${
                    fotos[aEscolherFoto] === p.id ? 'border-ink' : 'border-transparent'
                  }`}
                >
                  {p.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt="" className="aspect-[3/4] w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
            {photos.length === 0 && (
              <p className="mt-3 text-sm text-muted">
                A biblioteca está vazia — carrega fotografias em Fotografias.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
