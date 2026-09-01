'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Search,
  ArrowRight,
  ArrowLeft,
  Download,
  Save,
  Check,
  Pencil,
  Copy,
  Trash2,
  Plus,
  Image as ImageIcon,
  Images,
  ChevronRight,
  Layers,
  CheckSquare,
  Square,
  X,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { SlidePreview } from '@/components/studio/preview';
import { EditorDeEstilo } from '@/components/studio/editor-estilo';
import { extrairCarrosseis, type CarrosselLido } from '@/lib/extrair-slides';
import { descarregar, slideParaBlob, slideParaDataUrl } from '@/lib/studio-render';
import { ESTILOS_BASE, normalizar, type Estilo } from '@/lib/studio-estilos';
import type { PhotoRow } from '@/lib/types';

type Passo = 1 | 2 | 3 | 4;
type Foto = PhotoRow & { url: string | null };

const PASSOS: Array<{ n: Passo; label: string }> = [
  { n: 1, label: 'Documento' },
  { n: 2, label: 'Carrosséis' },
  { n: 3, label: 'Estilo' },
  { n: 4, label: 'Prontos' },
];

const ABERTAS = 'estudio-seccoes-abertas';

/** Quantos slides tem um carrossel quando é a Cát.IA a escrevê-lo de raiz. */
const SLIDES_POR_CARROSSEL = 7;

/** As escolhas de raiz de um carrossel: o primeiro estilo e nenhuma fotografia. */
function vazia(estiloId?: string): Escolha {
  return { estiloId: estiloId ?? ESTILOS_BASE[0].id, foto: null, fotos: {} };
}

/**
 * O que cada carrossel escolheu para si.
 * `foto` vale para o carrossel todo; `fotos` são as exceções, slide a slide —
 * é assim que dá para ter uma fotografia igual em tudo e trocar só a capa.
 */
interface Escolha {
  estiloId: string;
  foto: string | null;
  fotos: Record<number, string | null>;
}

/**
 * Carrosséis Creator.
 *
 * Um documento entra, saem todos os carrosséis que lá estão dentro. Escolhe-se
 * quais interessam, dá-se aspeto a cada um, e no fim descarregam-se — um, os
 * escolhidos, ou todos.
 */
export default function EstudioPage() {
  const router = useRouter();
  const [passo, setPasso] = useState<Passo>(1);

  // ── o documento ──
  const [texto, setTexto] = useState('');
  const [carrosseis, setCarrosseis] = useState<CarrosselLido[]>([]);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [aLer, setALer] = useState<string | null>(null);

  // ── o que ela escolheu levar ──
  const [marcados, setMarcados] = useState<Record<number, boolean>>({});
  const [escolhas, setEscolhas] = useState<Record<number, Escolha>>({});
  const [aVer, setAVer] = useState<number | null>(null);
  /** O carrossel aberto para ler e corrigir o texto, no passo dos carrosséis. */
  const [aLerTexto, setALerTexto] = useState<number | null>(null);
  /**
   * Qual o slide que vem na mão, e por cima de qual está.
   * O que vem na mão vive também numa referência: o `dragover` chega antes de
   * o React voltar a desenhar, e a partir do estado ainda veria nada.
   */
  const arrastado = useRef<number | null>(null);
  const [aArrastar, setAArrastar] = useState<number | null>(null);
  const [porCima, setPorCima] = useState<number | null>(null);

  // ── estilos, guardados na conta ──
  const [estilos, setEstilos] = useState<Estilo[]>(ESTILOS_BASE);
  const [rascunho, setRascunho] = useState<Estilo | null>(null);
  /** Quem está à espera de uma fotografia: um carrossel inteiro, ou um slide. */
  const [aEscolherFoto, setAEscolherFoto] = useState<{ i: number; slide: number | null } | null>(
    null,
  );
  /** O carrossel aberto para trabalhar, no passo do estilo. */
  const [aEditar, setAEditar] = useState<number | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);

  const [handle, setHandle] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [abertas, setAbertas] = useState<string[]>(['estilo']);
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(ABERTAS);
      if (guardado) setAbertas(JSON.parse(guardado));
    } catch {
      /* primeira vez */
    }
  }, []);

  /**
   * Um carrossel que vem de fora — da Última hora, por exemplo — entra já
   * escrito e vai direto ao passo do estilo.
   */
  useEffect(() => {
    const guardado = window.sessionStorage.getItem('estudio-importar');
    if (!guardado) return;
    window.sessionStorage.removeItem('estudio-importar');
    try {
      const vindo = JSON.parse(guardado) as {
        titulo?: string;
        slides?: string[];
        foto?: string | null;
      };
      if (!vindo.slides?.length) return;
      setCarrosseis([{ titulo: vindo.titulo ?? 'Carrossel', slides: vindo.slides }]);
      setMarcados({ 0: true });
      setEscolhas({ 0: { ...vazia(), foto: vindo.foto ?? null } });
      setPasso(3);
    } catch {
      /* veio estragado — segue-se como se nada fosse */
    }
  }, []);

  useEffect(() => {
    fetch('/api/estilos')
      .then((r) => r.json())
      .then((d) => {
        const guardados = (d.estilos ?? []) as Estilo[];
        if (guardados.length) setEstilos(guardados.map(normalizar));
      });
    fetch('/api/photos')
      .then((r) => r.json())
      .then((d) => setFotos(d.photos ?? []));
    fetch('/api/perfil')
      .then((r) => r.json())
      .then((d) => {
        const arroba = (d?.briefing?.instagram ?? '').trim();
        if (arroba) setHandle(arroba.startsWith('@') ? arroba : `@${arroba}`);
      });
  }, []);

  /**
   * Os estilos guardados chegam depois do documento poder já estar lido.
   * Se alguma escolha ficou presa a um estilo que já não existe, passa para o
   * primeiro — senão a pré-visualização mostra um aspeto e o ficheiro sai com
   * outro.
   */
  useEffect(() => {
    if (!estilos.length) return;
    setEscolhas((p) => {
      const validos = new Set(estilos.map((e) => e.id));
      let mudou = false;
      const novo = Object.fromEntries(
        Object.entries(p).map(([k, v]) => {
          if (validos.has(v.estiloId)) return [k, v];
          mudou = true;
          return [k, { ...v, estiloId: estilos[0].id }];
        }),
      );
      return mudou ? novo : p;
    });
  }, [estilos]);

  const gravarEstilos = useCallback(async (lista: Estilo[]) => {
    setEstilos(lista);
    await fetch('/api/estilos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estilos: lista }),
    });
  }, []);

  const estiloDe = (i: number) =>
    normalizar(
      estilos.find((e) => e.id === (escolhas[i]?.estiloId ?? estilos[0]?.id)) ??
        estilos[0] ??
        ESTILOS_BASE[0],
    );
  const fotoDe = (i: number) => escolhas[i]?.foto ?? null;
  /** A do slide, se ela lá pôs uma; senão a do carrossel. */
  const fotoDoSlide = (i: number, n: number) => escolhas[i]?.fotos?.[n] ?? escolhas[i]?.foto ?? null;
  const mudar = (i: number, p: Partial<Escolha>) =>
    setEscolhas((e) => ({ ...e, [i]: { ...(e[i] ?? vazia()), ...p } }));
  const escolhidos = carrosseis.map((_, i) => i).filter((i) => marcados[i]);

  function mostrar(achados: CarrosselLido[], comIA: boolean, encontrados?: number) {
    setCarrosseis(achados);
    setMarcados(Object.fromEntries(achados.map((_, i) => [i, true])));
    setEscolhas(Object.fromEntries(achados.map((_, i) => [i, vazia(estilos[0]?.id)])));
    const total = achados.reduce((a, c) => a + c.slides.length, 0);
    const faltaram = encontrados && encontrados > achados.length ? encontrados - achados.length : 0;
    setAviso({
      ok: true,
      msg: `Encontrei ${achados.length} ${achados.length === 1 ? 'carrossel' : 'carrosséis'} · ${total} slides${
        comIA ? ' · escritos pela Cát.IA' : ''
      }${faltaram ? ` · ${faltaram} não deram` : ''}`,
    });
  }

  function analisar() {
    const t = texto.trim();
    if (!t) return setAviso({ ok: false, msg: 'Cola primeiro o texto, ou carrega um ficheiro.' });
    const achados = extrairCarrosseis(t);
    if (achados.length) return mostrar(achados, false);
    lerDocumento(undefined, t);
  }

  /** PDF, Word, Excel ou texto: a app lê e devolve tudo o que lá está dentro. */
  async function lerDocumento(ficheiro?: File, colado?: string) {
    setALer(ficheiro ? `A ler ${ficheiro.name}…` : 'A ler o texto…');
    setAviso(null);
    setErro(null);
    try {
      let res: Response;
      if (ficheiro) {
        const form = new FormData();
        form.append('file', ficheiro);
        form.append('slides', String(SLIDES_POR_CARROSSEL));
        res = await fetch('/api/estudio/ler', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/estudio/ler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: colado, slides: SLIDES_POR_CARROSSEL }),
        });
      }
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      // o que veio do ficheiro fica na caixa: dá para ler, corrigir e voltar a analisar
      if (d.texto) setTexto(d.texto);
      mostrar(d.carrosseis ?? [], !!d.comIA, d.encontrados);
    } catch (e) {
      setAviso({ ok: false, msg: e instanceof Error ? e.message : 'Não consegui ler isso.' });
    } finally {
      setALer(null);
    }
  }

  /** Mexer no texto de um slide, ou no título do carrossel. */
  const mudarSlide = (i: number, n: number, texto: string) =>
    setCarrosseis((c) =>
      c.map((x, k) =>
        k === i ? { ...x, slides: x.slides.map((s, m) => (m === n ? texto : s)) } : x,
      ),
    );
  const mudarTitulo = (i: number, titulo: string) =>
    setCarrosseis((c) => c.map((x, k) => (k === i ? { ...x, titulo } : x)));
  const apagarSlide = (i: number, n: number) =>
    setCarrosseis((c) =>
      c.map((x, k) => (k === i ? { ...x, slides: x.slides.filter((_, m) => m !== n) } : x)),
    );
  /** Troca a ordem: o slide `de` passa a ficar na posição `para`. */
  const moverSlide = (i: number, de: number, para: number) =>
    setCarrosseis((c) =>
      c.map((x, k) => {
        if (k !== i || de === para) return x;
        const slides = [...x.slides];
        const [saiu] = slides.splice(de, 1);
        slides.splice(para, 0, saiu);
        return { ...x, slides };
      }),
    );

  /** Um slide novo, vazio, logo a seguir ao `n`. Sem `n`, vai para o fim. */
  const juntarSlide = (i: number, n?: number) =>
    setCarrosseis((c) =>
      c.map((x, k) => {
        if (k !== i) return x;
        const slides = [...x.slides];
        slides.splice(n === undefined ? slides.length : n + 1, 0, '');
        return { ...x, slides };
      }),
    );

  const opcoesDe = (i: number, n: number) => ({
    texto: carrosseis[i].slides[n],
    estilo: estiloDe(i),
    foto: fotoDoSlide(i, n),
    handle,
    escala: 3,
  });

  async function descarregarCarrossel(i: number) {
    const c = carrosseis[i];
    setOcupado(`c-${i}`);
    try {
      for (let n = 0; n < c.slides.length; n++) {
        const blob = await slideParaBlob(opcoesDe(i, n));
        if (blob) descarregar(blob, `${limpo(c.titulo)}-${n + 1}.png`);
        await new Promise((r) => setTimeout(r, 200));
      }
    } finally {
      setOcupado(null);
    }
  }

  async function descarregarVarios(indices: number[]) {
    setOcupado('varios');
    try {
      for (const i of indices) {
        const c = carrosseis[i];
        for (let n = 0; n < c.slides.length; n++) {
          setOcupado(`${limpo(c.titulo)} · slide ${n + 1}`);
          const blob = await slideParaBlob(opcoesDe(i, n));
          if (blob) descarregar(blob, `${limpo(c.titulo)}-${n + 1}.png`);
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    } finally {
      setOcupado(null);
    }
  }

  async function guardar(indices: number[]) {
    setOcupado('guardar');
    setErro(null);
    try {
      let ultimo = '';
      for (const i of indices) {
        const c = carrosseis[i];
        const imagens = [];
        for (let n = 0; n < c.slides.length; n++) {
          setOcupado(`a guardar ${limpo(c.titulo)} · ${n + 1}/${c.slides.length}`);
          imagens.push({
            texto: c.slides[n],
            imagem: await slideParaDataUrl({ ...opcoesDe(i, n), escala: 1 }),
          });
        }
        const d = await fetch('/api/carousels/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: c.titulo, slides: imagens }),
        }).then((r) => r.json());
        if (d.error) throw new Error(d.error);
        ultimo = d.carousel.id;
      }
      router.push(indices.length === 1 ? `/carrosseis/${ultimo}` : '/carrosseis');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui guardar.');
      setOcupado(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Carrosséis Creator"
        subtitle="Um documento entra, saem todos os carrosséis que lá estão dentro. Escolhes quais levas, dás-lhes aspeto, e descarregas."
      />

      {/* ── os passos ─────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-1">
        {PASSOS.map((p, i) => {
          const atual = passo === p.n;
          const feito = passo > p.n;
          return (
            <div key={p.n} className="flex items-center gap-1">
              <button
                onClick={() => (p.n === 1 || carrosseis.length ? setPasso(p.n) : null)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  atual ? 'bg-rosaSuave text-rosa' : feito ? 'text-ink' : 'text-muted'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    atual ? 'bg-rosa text-white' : feito ? 'bg-ink text-white' : 'bg-creme text-muted'
                  }`}
                >
                  {feito ? <Check className="h-3 w-3" /> : p.n}
                </span>
                {p.label}
              </button>
              {i < PASSOS.length - 1 && <ChevronRight className="h-4 w-4 text-sand" />}
            </div>
          );
        })}
      </div>

      {erro && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {erro}
        </div>
      )}

      {/* ── 1. o documento ────────────────────────────── */}
      {passo === 1 && (
        <>
          <Card className="mb-5">
            <label className="label">Cola o texto, ou carrega um documento</label>
            <textarea
              className="input min-h-[280px] text-[15px]"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={
                'Se já vier em "Slide 1: …" é lido logo. Se for texto corrido, a Cát.IA trata dele.'
              }
              disabled={!!aLer}
            />
            {aLer ? (
              <p className="mt-3">
                <Spinner label={aLer} />
              </p>
            ) : (
              aviso && (
                <p className={`mt-2 text-sm ${aviso.ok ? 'font-medium text-ink' : 'text-rose-700'}`}>
                  {aviso.msg}
                </p>
              )
            )}
          </Card>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label
              className={`btn-ghost cursor-pointer ${aLer ? 'pointer-events-none opacity-60' : ''}`}
            >
              <Upload className="h-4 w-4" /> Carregar documento
              <input
                type="file"
                accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) lerDocumento(f);
                  e.target.value = '';
                }}
              />
            </label>
            <span className="text-sm text-muted">PDF, Word, Excel, CSV ou texto.</span>

            <button className="btn-ghost ml-auto" onClick={analisar} disabled={!!aLer}>
              <Search className="h-4 w-4" /> Analisar o texto
            </button>
          </div>

          <div className="flex justify-end">
            <button
              className="btn-primary"
              onClick={() => setPasso(2)}
              disabled={!carrosseis.length || !!aLer}
            >
              Avançar <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* ── 2. os carrosséis encontrados ──────────────── */}
      {passo === 2 && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-sand bg-superficie px-4 py-3 text-sm">
            <strong>
              {escolhidos.length} de {carrosseis.length} escolhidos
            </strong>
            <button
              className="inline-flex items-center gap-1.5 text-xs underline hover:text-rosa"
              onClick={() => setMarcados(Object.fromEntries(carrosseis.map((_, i) => [i, true])))}
            >
              <CheckSquare className="h-3.5 w-3.5" /> Todos
            </button>
            <button
              className="inline-flex items-center gap-1.5 text-xs underline hover:text-rosa"
              onClick={() => setMarcados({})}
            >
              <Square className="h-3.5 w-3.5" /> Nenhum
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {carrosseis.map((c, i) => (
              <div
                key={i}
                className={`flex flex-col rounded-2xl border bg-superficie p-4 transition ${
                  marcados[i] ? 'border-ink' : 'border-sand'
                }`}
              >
                <label className="mb-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!marcados[i]}
                    onChange={(e) => setMarcados({ ...marcados, [i]: e.target.checked })}
                    className="h-4 w-4 accent-rosa"
                  />
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
                    <Layers className="h-3.5 w-3.5" /> {c.slides.length} slides
                  </span>
                </label>

                <button
                  onClick={() => setALerTexto(i)}
                  className="mb-4 flex-1 text-left"
                  title="Abrir para ler e corrigir"
                >
                  <p className="mb-2 line-clamp-2 text-[15px] font-semibold leading-snug">
                    {c.titulo}
                  </p>

                  <ol className="space-y-1.5 text-xs leading-relaxed text-muted">
                    {c.slides.slice(0, 4).map((s, n) => (
                      <li key={n} className="flex gap-1.5">
                        <span className="shrink-0 font-medium text-ink/50">{n + 1}.</span>
                        <span className="line-clamp-2">{s}</span>
                      </li>
                    ))}
                    {c.slides.length > 4 && (
                      <li className="pl-4 text-[11px]">e mais {c.slides.length - 4}…</li>
                    )}
                  </ol>
                </button>

                <div className="mt-auto flex gap-1.5">
                  <button
                    className="btn-ghost flex-1 !py-2 text-xs"
                    onClick={() => setALerTexto(i)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Ver e corrigir
                  </button>
                  <button
                    className="btn-ghost flex-1 !py-2 text-xs"
                    onClick={() => {
                      setMarcados({ [i]: true });
                      setPasso(3);
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Gerar este
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn-ghost" onClick={() => setPasso(1)}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div className="flex-1" />
            <button
              className="btn-escuro"
              onClick={() => setPasso(3)}
              disabled={!escolhidos.length}
            >
              {escolhidos.length === 1
                ? 'Dar aspeto a este'
                : `Dar aspeto aos ${escolhidos.length}`}{' '}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* ── o carrossel aberto para corrigir o texto ──── */}
      {aLerTexto !== null && carrosseis[aLerTexto] && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-6 backdrop-blur-sm"
          onClick={() => setALerTexto(null)}
        >
          <div className="card my-6 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] uppercase tracking-wider text-muted">
                  {carrosseis[aLerTexto].slides.length} slides · corrige o texto, arrasta para
                  mudar a ordem
                </p>
                <input
                  className="input font-semibold"
                  value={carrosseis[aLerTexto].titulo}
                  onChange={(e) => mudarTitulo(aLerTexto, e.target.value)}
                />
              </div>
              <button
                onClick={() => setALerTexto(null)}
                className="mt-6 rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {carrosseis[aLerTexto].slides.map((s, n) => (
                <div
                  key={n}
                  onDragOver={(e) => {
                    if (arrastado.current === null) return;
                    e.preventDefault();
                    setPorCima(n);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (arrastado.current !== null) moverSlide(aLerTexto, arrastado.current, n);
                    arrastado.current = null;
                    setAArrastar(null);
                    setPorCima(null);
                  }}
                  className={`flex gap-2 rounded-xl transition ${
                    aArrastar === n
                      ? 'opacity-40'
                      : porCima === n
                        ? 'ring-2 ring-rosa/60'
                        : ''
                  }`}
                >
                  <span
                    draggable
                    onDragStart={() => {
                      arrastado.current = n;
                      setAArrastar(n);
                    }}
                    onDragEnd={() => {
                      arrastado.current = null;
                      setAArrastar(null);
                      setPorCima(null);
                    }}
                    title="Arrasta para mudar a ordem"
                    className="mt-2 flex w-6 shrink-0 cursor-grab flex-col items-center gap-0.5 rounded-lg py-1 text-muted transition hover:bg-creme hover:text-ink active:cursor-grabbing"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-medium">{n + 1}</span>
                  </span>
                  <textarea
                    className="input min-h-[64px] flex-1 text-sm leading-relaxed"
                    value={s}
                    onChange={(e) => mudarSlide(aLerTexto, n, e.target.value)}
                  />
                  <span className="mt-2 flex shrink-0 flex-col gap-1">
                    <button
                      onClick={() => juntarSlide(aLerTexto, n)}
                      title="Meter um slide a seguir a este"
                      className="rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => apagarSlide(aLerTexto, n)}
                      title="Apagar este slide"
                      className="rounded-lg p-1.5 text-muted transition hover:bg-rosaSuave hover:text-rosa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              ))}
            </div>

            {carrosseis[aLerTexto].legenda && (
              <div className="mt-4 rounded-xl border border-sand bg-creme/60 p-3">
                <p className="label mb-1">Legenda que veio no documento</p>
                <p className="text-sm leading-relaxed text-muted">
                  {carrosseis[aLerTexto].legenda}
                </p>
              </div>
            )}

            <button
              className="mt-3 w-full rounded-xl border border-dashed border-sand py-2.5 text-sm text-muted transition hover:border-ink/40 hover:text-ink"
              onClick={() => juntarSlide(aLerTexto)}
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" /> Acrescentar um slide no fim
            </button>

            <div className="mt-4 flex items-center gap-2 border-t border-sand pt-4">
              <button
                className="btn-ghost !py-2 text-xs"
                onClick={() => {
                  setMarcados({ [aLerTexto]: true });
                  setALerTexto(null);
                  setPasso(3);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Gerar só este
              </button>
              <button className="btn-primary ml-auto" onClick={() => setALerTexto(null)}>
                <Check className="h-4 w-4" /> Está assim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. o aspeto, carrossel a carrossel ────────── */}
      {passo === 3 && (
        <>
          <p className="mb-4 text-sm text-muted">
            Clica num carrossel para o abrir e lhe dares aspeto. O que fizeres lá dentro pode
            depois ser aplicado a todos.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {escolhidos.map((i) => {
              const c = carrosseis[i];
              const proprias = Object.values(escolhas[i]?.fotos ?? {}).filter(Boolean).length;
              return (
                <button
                  key={i}
                  onClick={() => setAEditar(i)}
                  className="overflow-hidden rounded-2xl border border-sand bg-superficie text-left transition hover:border-ink/40 hover:shadow-soft"
                >
                  <SlidePreview
                    estilo={estiloDe(i)}
                    foto={fotoDoSlide(i, 0)}
                    texto={c.slides[0]}
                    handle={handle}
                    arredondado={false}
                  />
                  <div className="p-3">
                    <p className="mb-1 line-clamp-1 text-sm font-medium">{c.titulo}</p>
                    <p className="text-[11px] text-muted">
                      {c.slides.length} slides · {estiloDe(i).nome}
                      {fotoDe(i) ? ' · com fotografia' : ''}
                      {proprias ? ` · ${proprias} slide${proprias > 1 ? 's' : ''} à parte` : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn-ghost" onClick={() => setPasso(2)}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div className="flex-1" />
            <button className="btn-escuro" onClick={() => setPasso(4)}>
              <Sparkles className="h-4 w-4" />
              {escolhidos.length === 1 ? 'Gerar o carrossel' : `Gerar os ${escolhidos.length}`}
            </button>
          </div>
        </>
      )}

      {/* ── um carrossel aberto: estilo e fotografias ─── */}
      {aEditar !== null && carrosseis[aEditar] && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-6 backdrop-blur-sm"
          onClick={() => setAEditar(null)}
        >
          <div className="card my-6 w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  {carrosseis[aEditar].slides.length} slides
                </p>
                <h2 className="text-lg font-semibold leading-snug">{carrosseis[aEditar].titulo}</h2>
              </div>
              <button
                onClick={() => setAEditar(null)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* estilo */}
            <div className="mb-4 rounded-2xl border border-sand p-4">
              <p className="label mb-2">Estilo</p>

              {/* as escolhas */}
              <div className="flex flex-wrap gap-2">
                {estilos.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => mudar(aEditar, { estiloId: e.id })}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-sm transition ${
                      estiloDe(aEditar).id === e.id
                        ? 'border-ink bg-creme font-medium'
                        : 'border-sand hover:border-ink/30'
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-md border border-black/10"
                      style={{ background: e.corFundo }}
                    />
                    {e.nome}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setRascunho({ ...ESTILOS_BASE[0], id: `e${Date.now()}`, nome: 'Estilo novo' })
                  }
                  className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-sand px-3.5 py-2.5 text-sm text-muted transition hover:border-rosa hover:text-rosa"
                >
                  <Plus className="h-4 w-4" /> Criar estilo
                </button>
              </div>

              {/* o que se pode fazer ao estilo escolhido — mais discreto, de propósito */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-sand pt-3 text-xs">
                <span className="text-muted">
                  Sobre <strong className="font-medium text-ink">{estiloDe(aEditar).nome}</strong>:
                </span>
                <button
                  className="inline-flex items-center gap-1 text-muted transition hover:text-ink hover:underline"
                  onClick={() => setRascunho(estiloDe(aEditar))}
                >
                  <Pencil className="h-3 w-3" /> afinar
                </button>
                <button
                  className="inline-flex items-center gap-1 text-muted transition hover:text-ink hover:underline"
                  onClick={() => {
                    const e = estilos.find((x) => x.id === estiloDe(aEditar).id);
                    if (!e) return;
                    const novo = { ...e, id: `e${Date.now()}`, nome: `${e.nome} (cópia)` };
                    gravarEstilos([...estilos, novo]);
                    mudar(aEditar, { estiloId: novo.id });
                  }}
                >
                  <Copy className="h-3 w-3" /> duplicar
                </button>
                {estilos.length > 1 && (
                  <button
                    className="inline-flex items-center gap-1 text-muted transition hover:text-rosa hover:underline"
                    onClick={() => {
                      const resto = estilos.filter((x) => x.id !== estiloDe(aEditar).id);
                      gravarEstilos(resto);
                      mudar(aEditar, { estiloId: resto[0].id });
                    }}
                  >
                    <Trash2 className="h-3 w-3" /> apagar
                  </button>
                )}
              </div>
            </div>

            {/* fotografia do carrossel inteiro */}
            <div className="mb-4 rounded-2xl border border-sand p-4">
              <p className="label mb-2">Fotografia de fundo</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="flex items-center gap-2 rounded-xl border-2 border-sand px-3.5 py-2.5 text-sm transition hover:border-ink/30"
                  onClick={() => setAEscolherFoto({ i: aEditar, slide: null })}
                >
                  {fotoDe(aEditar) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoDe(aEditar) as string}
                      alt=""
                      className="h-5 w-5 rounded-md object-cover"
                    />
                  ) : (
                    <Images className="h-4 w-4 text-muted" />
                  )}
                  {fotoDe(aEditar) ? 'Trocar a de todos os slides' : 'Uma para todos os slides'}
                </button>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-sand px-3.5 py-2.5 text-sm text-muted transition hover:border-rosa hover:text-rosa">
                  <ImageIcon className="h-4 w-4" /> Do computador
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) mudar(aEditar, { foto: URL.createObjectURL(f) });
                    }}
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-sand pt-3 text-xs">
                <span className="text-muted">ou uma para cada slide, em baixo</span>
                {(fotoDe(aEditar) || Object.keys(escolhas[aEditar]?.fotos ?? {}).length > 0) && (
                  <button
                    className="inline-flex items-center gap-1 text-muted transition hover:text-rosa hover:underline"
                    onClick={() => mudar(aEditar, { foto: null, fotos: {} })}
                  >
                    <X className="h-3 w-3" /> tirar as fotografias
                  </button>
                )}
              </div>
            </div>

            {/* slide a slide */}
            <div className="grid max-h-[52vh] gap-3 overflow-y-auto [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
              {carrosseis[aEditar].slides.map((s, n) => (
                <div key={n} className="overflow-hidden rounded-xl border border-sand">
                  <SlidePreview
                    estilo={estiloDe(aEditar)}
                    foto={fotoDoSlide(aEditar, n)}
                    texto={s}
                    handle={handle}
                    arredondado={false}
                  />
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px] text-muted">
                    <span>Slide {n + 1}</span>
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => setAEscolherFoto({ i: aEditar, slide: n })}
                        title="Fotografia só deste slide"
                        className="rounded p-1 transition hover:bg-creme hover:text-ink"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                      </button>
                      {escolhas[aEditar]?.fotos?.[n] && (
                        <button
                          onClick={() => {
                            const fotos = { ...(escolhas[aEditar]?.fotos ?? {}) };
                            delete fotos[n];
                            mudar(aEditar, { fotos });
                          }}
                          title="Voltar à do carrossel"
                          className="rounded p-1 transition hover:bg-rosaSuave hover:text-rosa"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-sand pt-4">
              <button
                className="btn-ghost !py-2 text-xs"
                onClick={() => {
                  const modelo = escolhas[aEditar];
                  setEscolhas((p) =>
                    Object.fromEntries(
                      Object.entries(p).map(([k, v]) =>
                        escolhidos.includes(Number(k))
                          ? [k, { ...v, estiloId: modelo.estiloId, foto: modelo.foto }]
                          : [k, v],
                      ),
                    ),
                  );
                }}
              >
                <Layers className="h-3.5 w-3.5" /> Aplicar este aspeto a todos os carrosséis
              </button>
              <button className="btn-primary ml-auto" onClick={() => setAEditar(null)}>
                <Check className="h-4 w-4" /> Está assim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. prontos ────────────────────────────────── */}
      {passo === 4 && (
        <>
          <p className="mb-4 text-sm text-muted">
            {escolhidos.length === 1 ? 'Está pronto' : `Estão ${escolhidos.length} prontos`}. Clica
            num cartão para o ver todo, slide a slide.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {escolhidos.map((i) => {
              const c = carrosseis[i];
              return (
                <div key={i} className="overflow-hidden rounded-2xl border border-sand bg-superficie">
                  <button onClick={() => setAVer(i)} className="block w-full text-left">
                    <SlidePreview
                      estilo={estiloDe(i)}
                      foto={fotoDoSlide(i, 0)}
                      texto={c.slides[0]}
                      handle={handle}
                      arredondado={false}
                    />
                  </button>
                  <div className="p-3">
                    <p className="mb-2 line-clamp-1 text-sm font-medium">{c.titulo}</p>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{c.slides.length} slides</span>
                      <button
                        onClick={() => descarregarCarrossel(i)}
                        disabled={!!ocupado}
                        className="inline-flex items-center gap-1 font-medium text-rosa"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {ocupado === `c-${i}` ? 'a descarregar…' : '4K'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn-ghost" onClick={() => setPasso(3)}>
              <ArrowLeft className="h-4 w-4" /> Afinar o aspeto
            </button>
            <div className="flex-1" />
            <button
              className="btn-ghost"
              onClick={() => guardar(escolhidos)}
              disabled={!!ocupado}
            >
              {ocupado?.startsWith('a guardar') || ocupado === 'guardar' ? (
                <Spinner label={ocupado === 'guardar' ? 'A guardar…' : ocupado} />
              ) : (
                <>
                  <Save className="h-4 w-4" /> Guardar na biblioteca
                </>
              )}
            </button>
            <button
              className="btn-escuro"
              onClick={() => descarregarVarios(escolhidos)}
              disabled={!!ocupado}
            >
              {ocupado && !ocupado.startsWith('a guardar') && ocupado !== 'guardar' ? (
                <Spinner label={ocupado === 'varios' ? 'A exportar…' : ocupado} />
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {escolhidos.length === 1 ? 'Descarregar em 4K' : `Descarregar os ${escolhidos.length} em 4K`}
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── o carrossel inteiro ───────────────────────── */}
      {aVer !== null && carrosseis[aVer] && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-6 backdrop-blur-sm"
          onClick={() => setAVer(null)}
        >
          <div className="card my-6 w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  {carrosseis[aVer].slides.length} slides
                </p>
                <h2 className="text-lg font-semibold leading-snug">{carrosseis[aVer].titulo}</h2>
              </div>
              <button
                className="btn-ghost !py-2 text-xs"
                onClick={() => descarregarCarrossel(aVer)}
                disabled={!!ocupado}
              >
                <Download className="h-3.5 w-3.5" /> 4K
              </button>
              <button
                onClick={() => setAVer(null)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid max-h-[70vh] gap-3 overflow-y-auto [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
              {carrosseis[aVer].slides.map((s, n) => (
                <div key={n} className="overflow-hidden rounded-xl border border-sand">
                  <SlidePreview
                    estilo={estiloDe(aVer)}
                    foto={fotoDoSlide(aVer, n)}
                    texto={s}
                    handle={handle}
                    arredondado={false}
                  />
                  <p className="px-2 py-1.5 text-[11px] text-muted">Slide {n + 1}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {rascunho && (
        <EditorDeEstilo
          rascunho={rascunho}
          setRascunho={setRascunho}
          foto={aEditar !== null ? fotoDoSlide(aEditar, 0) : null}
          texto={aEditar !== null ? carrosseis[aEditar]?.slides[0] : undefined}
          handle={handle}
          aoEscolherFoto={
            aEditar !== null ? () => setAEscolherFoto({ i: aEditar, slide: null }) : undefined
          }
          aoCarregarFoto={
            aEditar !== null
              ? (f) => mudar(aEditar, { foto: URL.createObjectURL(f) })
              : undefined
          }
          aoTirarFoto={aEditar !== null ? () => mudar(aEditar, { foto: null }) : undefined}
          aoFechar={() => setRascunho(null)}
          aoGuardar={() => {
            const existe = estilos.some((e) => e.id === rascunho.id);
            gravarEstilos(
              existe
                ? estilos.map((e) => (e.id === rascunho.id ? rascunho : e))
                : [...estilos, rascunho],
            );
            // um estilo novo passa a ser o do carrossel que está aberto
            if (!existe && aEditar !== null) mudar(aEditar, { estiloId: rascunho.id });
            setRascunho(null);
          }}
        />
      )}

      {aEscolherFoto !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm"
          onClick={() => setAEscolherFoto(null)}
        >
          <div className="card w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-lg font-semibold">A tua biblioteca</h2>
            <p className="mb-3 text-sm text-muted">
              {aEscolherFoto.slide === null
                ? 'Esta fotografia fica em todos os slides deste carrossel.'
                : `Esta fotografia fica só no slide ${aEscolherFoto.slide + 1}.`}
            </p>
            <div className="grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto md:grid-cols-6">
              {fotos.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    if (f.url) {
                      const { i, slide } = aEscolherFoto;
                      if (slide === null) mudar(i, { foto: f.url });
                      else mudar(i, { fotos: { ...(escolhas[i]?.fotos ?? {}), [slide]: f.url } });
                    }
                    setAEscolherFoto(null);
                  }}
                  className="overflow-hidden rounded-xl border-2 border-transparent hover:border-ink"
                >
                  {f.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt="" className="aspect-[3/4] w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
            {fotos.length === 0 && (
              <p className="mt-3 text-sm text-muted">
                Ainda não tens fotografias — carrega-as em Biblioteca · Fotografias.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Nome de ficheiro sem acentos nem espaços — os sistemas agradecem. */
function limpo(titulo: string) {
  return (
    titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 40) || 'carrossel'
  );
}
