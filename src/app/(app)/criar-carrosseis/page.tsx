'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Images,
  Italic,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import JSZip from 'jszip';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { SlidePreview } from '@/components/studio/preview';
import { EditorDeEstilo } from '@/components/studio/editor-estilo';
import { extrairDoTexto, type CarrosselLido } from '@/lib/fabrica-extrair';
import { envolver, semMarcas, type Marca } from '@/lib/studio-texto';
import { descarregar, slideParaBlob } from '@/lib/studio-render';
import {
  CORES_FUNDO,
  ESTILOS_BASE,
  comAjuste,
  normalizar,
  type AjusteDoSlide,
  type Alinhamento,
  type Estilo,
} from '@/lib/studio-estilos';
import type { PhotoRow } from '@/lib/types';

type Passo = 1 | 2 | 3;
type Foto = PhotoRow & { url: string | null };

const PASSOS: Array<{ n: Passo; label: string }> = [
  { n: 1, label: 'Documento' },
  { n: 2, label: 'Estilo' },
  { n: 3, label: 'Gerar' },
];

/** O que fica guardado no browser entre visitas. */
const GUARDADO = 'fabrica-rascunho';
const ABERTAS = 'fabrica-seccoes-abertas';

interface Rascunho {
  texto: string;
  carrosseis: CarrosselLido[];
  ajustes: Record<string, AjusteDoSlide>;
  fotosDeSlide: Record<string, string>;
}

const VAZIO: Rascunho = { texto: '', carrosseis: [], ajustes: {}, fotosDeSlide: {} };

/**
 * Quantos slides cabem num carrossel.
 *
 * É o que o Instagram deixa levar num carrossel só — e a partir daí ninguém
 * vai até ao fim. A conta é do carrossel todo, não do que se acrescenta.
 */
const MAX_SLIDES = 20;

/** A chave de um slide dentro de um carrossel. */
const chave = (ci: number, si: number) => `${ci}:${si}`;

/** Renumera as chaves `ci:si` depois de apagar ou reordenar slides. */
function renumerar<T>(mapa: Record<string, T>, ci: number, ordem: number[]): Record<string, T> {
  const saida: Record<string, T> = {};
  for (const [k, v] of Object.entries(mapa)) {
    const [c, s] = k.split(':').map(Number);
    if (c !== ci) {
      saida[k] = v;
      continue;
    }
    const novo = ordem.indexOf(s);
    if (novo >= 0) saida[chave(ci, novo)] = v;
  }
  return saida;
}

const limpo = (t?: string) =>
  (t || 'carrossel')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'carrossel';

/**
 * A Fábrica de carrosséis.
 *
 * Três passos e nada mais: colas o texto, escolhes o visual, e sais com os
 * slides. O texto é lido aqui no browser — sem esperar por ninguém e sem
 * limite de tamanho. Depois cada slide pode ser afinado sozinho: a foto, o
 * tamanho da letra, o negrito, o alinhamento.
 */
export default function Fabrica() {

  const [passo, setPasso] = useState<Passo>(1);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // ── o rascunho: fica no browser, para não se perder ao fechar o separador ──
  const [texto, setTexto] = useState('');
  const [carrosseis, setCarrosseis] = useState<CarrosselLido[]>([]);
  const [ajustes, setAjustes] = useState<Record<string, AjusteDoSlide>>({});
  const [fotosDeSlide, setFotosDeSlide] = useState<Record<string, string>>({});
  const [lido, setLido] = useState(false);

  useEffect(() => {
    try {
      const cru = window.localStorage.getItem(GUARDADO);
      if (cru) {
        const r = { ...VAZIO, ...(JSON.parse(cru) as Partial<Rascunho>) };
        setTexto(r.texto ?? '');
        setCarrosseis(r.carrosseis ?? []);
        setAjustes(r.ajustes ?? {});
        setFotosDeSlide(r.fotosDeSlide ?? {});
      }
    } catch {
      // rascunho estragado: começa-se do princípio, que é melhor do que rebentar
    }
    setLido(true);
  }, []);

  useEffect(() => {
    if (!lido) return;
    try {
      const r: Rascunho = { texto, carrosseis, ajustes, fotosDeSlide };
      window.localStorage.setItem(GUARDADO, JSON.stringify(r));
    } catch {
      // sem espaço ou em janela privada: perde-se o rascunho, não o trabalho
    }
  }, [lido, texto, carrosseis, ajustes, fotosDeSlide]);

  // ── as secções do passo 2 lembram-se de como as deixaste ──
  const [abertas, setAbertas] = useState<string[]>(['estilo']);
  useEffect(() => {
    try {
      const g = window.localStorage.getItem(ABERTAS);
      if (g) setAbertas(JSON.parse(g));
    } catch {
      // fica com as de partida
    }
  }, []);
  const alternar = (id: string) =>
    setAbertas((p) => {
      const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
      try {
        window.localStorage.setItem(ABERTAS, JSON.stringify(n));
      } catch {
        // idem
      }
      return n;
    });

  // ── estilos, guardados na conta ──
  const [estilos, setEstilos] = useState<Estilo[]>(ESTILOS_BASE);
  const [estiloId, setEstiloId] = useState<string>(ESTILOS_BASE[0].id);
  const [rascunhoEstilo, setRascunhoEstilo] = useState<Estilo | null>(null);

  const [fotos, setFotos] = useState<Foto[]>([]);
  const [handle, setHandle] = useState('');

  useEffect(() => {
    fetch('/api/estilos')
      .then((r) => r.json())
      .then((d) => {
        const guardados = (d.estilos ?? []) as Estilo[];
        if (guardados.length) {
          const lista = guardados.map(normalizar);
          setEstilos(lista);
          setEstiloId(lista[0].id);
        }
      })
      .catch(() => undefined);
    fetch('/api/photos')
      .then((r) => r.json())
      .then((d) => setFotos(d.photos ?? []))
      .catch(() => undefined);
    fetch('/api/perfil')
      .then((r) => r.json())
      .then((d) => {
        const h = d.perfil?.instagram as string | undefined;
        if (h) setHandle(h.startsWith('@') ? h : `@${h}`);
      })
      .catch(() => undefined);
  }, []);

  async function gravarEstilos(lista: Estilo[]) {
    setEstilos(lista);
    await fetch('/api/estilos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estilos: lista }),
    }).catch(() => undefined);
  }

  // ── que carrosséis levam o estilo, e que carrosséis saem ──
  const [ambito, setAmbito] = useState<'todos' | 'estes'>('todos');
  const [estiloPorCarrossel, setEstiloPorCarrossel] = useState<Record<number, string>>({});
  const [ativo, setAtivo] = useState(0);
  const [alvos, setAlvos] = useState<number[]>([]);
  const [escolhidos, setEscolhidos] = useState<number[]>([]);

  const escolhidosIdx = useMemo(
    () =>
      escolhidos.length
        ? escolhidos.filter((i) => carrosseis[i])
        : carrosseis.length
          ? [ativo]
          : [],
    [escolhidos, carrosseis, ativo],
  );

  const alvosValidos = alvos.filter((i) => i < carrosseis.length);
  const alvosDoEstilo = alvosValidos.length ? alvosValidos : [ativo];

  // ── o fundo: uma cor, ou uma fotografia ──
  const [modoFundo, setModoFundo] = useState<'cor' | 'foto'>('cor');
  const [fotoDeFundo, setFotoDeFundo] = useState<string | null>(null);
  const [fotosPorCarrossel, setFotosPorCarrossel] = useState<Record<number, string | null>>({});
  const [bibliotecaPara, setBibliotecaPara] = useState<
    { tipo: 'fundo' } | { tipo: 'slide'; c: number; s: number } | null
  >(null);
  /** Na biblioteca de um slide: a foto é só dele, ou do carrossel inteiro? */
  const [fotoParaTodos, setFotoParaTodos] = useState(false);
  /** O slide acabado de acrescentar, para abrir logo a escrita nele. */
  const [slideNovo, setSlideNovo] = useState<{ c: number; s: number } | null>(null);

  const estiloSelecionado = normalizar(
    estilos.find((e) => e.id === estiloId) ?? estilos[0] ?? ESTILOS_BASE[0],
  );

  const estiloDoCarrossel = (ci: number) =>
    normalizar(
      estilos.find(
        (e) => e.id === (ambito === 'todos' ? estiloId : (estiloPorCarrossel[ci] ?? estiloId)),
      ) ?? estiloSelecionado,
    );

  /** O estilo do carrossel com os ajustes deste slide por cima. */
  const estiloDoSlide = (ci: number, si: number) =>
    comAjuste(estiloDoCarrossel(ci), ajustes[chave(ci, si)]);

  const fotoDoSlide = (ci: number, si: number) => {
    if (modoFundo !== 'foto') return null;
    const daquele = fotosDeSlide[chave(ci, si)];
    if (daquele) return daquele;
    const doCarrossel = fotosPorCarrossel[ci];
    if (doCarrossel !== undefined) return doCarrossel;
    return fotoDeFundo;
  };

  const opcoesDe = (ci: number, si: number) => ({
    texto: carrosseis[ci].slides[si],
    estilo: estiloDoSlide(ci, si),
    foto: fotoDoSlide(ci, si),
    handle: handle || undefined,
  });

  function ajustar(ci: number, si: number, patch: Partial<AjusteDoSlide>) {
    setAjustes((p) => ({ ...p, [chave(ci, si)]: { ...(p[chave(ci, si)] || {}), ...patch } }));
  }

  function reporTexto(ci: number, si: number) {
    setAjustes((p) => {
      const n = { ...p };
      delete n[chave(ci, si)];
      return n;
    });
  }

  function mudarTexto(ci: number, si: number, valor: string) {
    setCarrosseis((p) =>
      p.map((c, i) =>
        i === ci ? { ...c, slides: c.slides.map((s, j) => (j === si ? valor : s)) } : c,
      ),
    );
  }

  /** Um slide novo, vazio, a seguir a outro — para escrever ali mesmo. */
  function adicionarSlide(ci: number, depoisDe: number) {
    const total = carrosseis[ci]?.slides.length ?? 0;
    if (total >= MAX_SLIDES) {
      setErro(`Um carrossel leva no máximo ${MAX_SLIDES} slides.`);
      return;
    }
    setErro(null);
    const onde = Math.min(Math.max(depoisDe + 1, 0), total);
    // o -1 é o lugar do novo: não vem de lado nenhum, por isso não traz
    // foto nem ajustes, e empurra para a frente os que estavam a seguir
    const ordem = Array.from({ length: total }, (_, i) => i);
    ordem.splice(onde, 0, -1);
    setCarrosseis((p) =>
      p.map((c, i) => {
        if (i !== ci) return c;
        const slides = [...c.slides];
        slides.splice(onde, 0, '');
        return { ...c, slides };
      }),
    );
    setFotosDeSlide((p) => renumerar(p, ci, ordem));
    setAjustes((p) => renumerar(p, ci, ordem));
    setSlideNovo({ c: ci, s: onde });
  }

  function apagarSlide(ci: number, si: number) {
    const total = carrosseis[ci]?.slides.length ?? 0;
    if (total <= 1) {
      setErro('O carrossel tem de ter pelo menos um slide.');
      return;
    }
    const ordem = Array.from({ length: total }, (_, i) => i).filter((i) => i !== si);
    setCarrosseis((p) =>
      p.map((c, i) => (i === ci ? { ...c, slides: c.slides.filter((_, j) => j !== si) } : c)),
    );
    setFotosDeSlide((p) => renumerar(p, ci, ordem));
    setAjustes((p) => renumerar(p, ci, ordem));
  }

  function moverSlide(ci: number, de: number, para: number) {
    if (de === para) return;
    const total = carrosseis[ci]?.slides.length ?? 0;
    const ordem = Array.from({ length: total }, (_, i) => i);
    const [m] = ordem.splice(de, 1);
    ordem.splice(para, 0, m);
    setCarrosseis((p) =>
      p.map((c, i) => {
        if (i !== ci) return c;
        const s = [...c.slides];
        const [x] = s.splice(de, 1);
        s.splice(para, 0, x);
        return { ...c, slides: s };
      }),
    );
    setFotosDeSlide((p) => renumerar(p, ci, ordem));
    setAjustes((p) => renumerar(p, ci, ordem));
  }

  function aplicarFotoAoCarrossel(ci: number, url: string) {
    setFotosDeSlide((p) => {
      const n = { ...p };
      (carrosseis[ci]?.slides ?? []).forEach((_, si) => {
        n[chave(ci, si)] = url;
      });
      return n;
    });
  }

  function escolherFoto(url: string | null) {
    if (bibliotecaPara?.tipo === 'slide') {
      const { c, s } = bibliotecaPara;
      if (url && fotoParaTodos) aplicarFotoAoCarrossel(c, url);
      else
        setFotosDeSlide((p) => {
          const n = { ...p };
          if (url) n[chave(c, s)] = url;
          else delete n[chave(c, s)];
          return n;
        });
      // Escolher uma fotografia é dizer que se quer fotografia. Sem isto o
      // fundo continuava em "cor" e a foto ficava guardada sem aparecer —
      // que é o mesmo que não acontecer nada.
      if (url) setModoFundo('foto');
    } else {
      setFotoDeFundo(url);
      setFotosPorCarrossel({});
      setFotosDeSlide({});
      if (url) setModoFundo('foto');
    }
    setBibliotecaPara(null);
  }

  /** Liga ou desliga um carrossel da escolha. Tem de sobrar sempre um. */
  function alternarCarrossel(i: number) {
    const dentro = escolhidosIdx;
    if (!dentro.includes(i)) {
      setEscolhidos([...dentro, i].sort((a, b) => a - b));
      return;
    }
    if (dentro.length === 1) return;
    setEscolhidos(dentro.filter((x) => x !== i));
  }

  function aplicarEstiloATodos(id: string) {
    setEstiloId(id);
    setEstiloPorCarrossel({});
    setAmbito('todos');
  }

  function aplicarEstiloAoCarrossel(ci: number, id: string) {
    setEstiloPorCarrossel((p) => ({ ...p, [ci]: id }));
    setAmbito('estes');
  }

  function escolherEstilo(id: string) {
    setEstiloId(id);
    if (ambito === 'estes') {
      setEstiloPorCarrossel((p) => {
        const n = { ...p };
        alvosDoEstilo.forEach((i) => {
          n[i] = id;
        });
        return n;
      });
    }
  }

  // ── passo 1: ler o texto ──
  const [aAnalisar, setAAnalisar] = useState(false);
  const [aLerFicheiro, setALerFicheiro] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);

  /**
   * Trazer um documento para dentro da caixa.
   *
   * O texto e o markdown lêem-se aqui mesmo, no browser: é instantâneo e não
   * sai da máquina. O PDF e o Word não se conseguem abrir aqui — vão dar uma
   * volta pelo servidor só para lhes tirar o texto de dentro, e nada fica
   * guardado lá.
   */
  async function importar(f: File) {
    setAviso(null);
    const simples = /\.(txt|md|markdown)$/i.test(f.name) || f.type.startsWith('text/');
    if (simples) {
      setTexto(await f.text());
      setAviso({ ok: true, msg: `${f.name} — o texto está aí em baixo. Agora carrega em Analisar.` });
      return;
    }

    setALerFicheiro(true);
    try {
      const corpo = new FormData();
      corpo.append('file', f);
      const r = await fetch('/api/estudio/texto', { method: 'POST', body: corpo });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setTexto(d.texto ?? '');
      setAviso({
        ok: true,
        msg: `${f.name} — o texto está aí em baixo. Confere antes de analisar: os documentos às vezes trazem lixo de cabeçalhos e números de página.`,
      });
    } catch (e) {
      setAviso({
        ok: false,
        msg: e instanceof Error ? e.message : 'Não consegui ler esse ficheiro.',
      });
    } finally {
      setALerFicheiro(false);
    }
  }

  function assentar(achados: CarrosselLido[], nota: string) {
    setCarrosseis(achados);
    setAjustes({});
    setFotosDeSlide({});
    setAtivo(0);
    setEscolhidos(achados.map((_, i) => i));
    setAlvos([]);
    const slides = achados.reduce((a, c) => a + c.slides.length, 0);
    setAviso({
      ok: true,
      msg: `${achados.length === 1 ? '1 carrossel' : `${achados.length} carrosséis`} · ${slides} slides.${nota}`,
    });
  }

  /**
   * Lê o texto.
   *
   * Primeiro aqui, de graça e num instante. Mas o leitor local só acerta nos
   * feitios que conhece: se um documento traz nove carrosséis com os títulos
   * escritos de uma maneira que ninguém previu, ele cola-os todos num só. Por
   * isso, quando de um texto grande sai um carrossel só, pergunta-se à Cát.IA
   * onde é que cada um começa e acaba.
   *
   * Ela devolve só números de linha — o texto é recortado do original. Não há
   * nada que ela possa reescrever pelo caminho.
   */
  async function analisar() {
    const t = texto.trim();
    if (!t) {
      setAviso({ ok: false, msg: 'Cola primeiro o texto com os slides.' });
      return;
    }
    setAAnalisar(true);
    setAviso(null);
    setErro(null);

    const achados = extrairDoTexto(t);

    // um carrossel só, mas com slides que cheguem para vários? é suspeito
    const suspeito = achados.length <= 1 && (achados[0]?.slides.length ?? 0) > 12;

    if (achados.length && !suspeito) {
      setAAnalisar(false);
      assentar(achados, '');
      return;
    }

    if (!achados.length && t.length < 120) {
      setAAnalisar(false);
      setAviso({
        ok: false,
        msg: 'Não encontrei slides neste texto. Costuma vir em "Slide 1: …", em lista, ou com os parágrafos separados por uma linha em branco.',
      });
      return;
    }

    // a Cát.IA marca onde cada carrossel começa e acaba
    setOcupado('a pedir à Cát.IA para separar os carrosséis');
    try {
      const d = await fetch('/api/estudio/separar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: t }),
      }).then((r) => r.json());

      if (d.error) throw new Error(d.error);
      const daIA = (d.carrosseis ?? []) as CarrosselLido[];

      if (daIA.length > achados.length) {
        assentar(daIA, ' A Cát.IA separou-os.');
      } else if (achados.length) {
        assentar(achados, '');
      } else {
        setAviso({ ok: false, msg: 'Não encontrei carrosséis neste texto.' });
      }
    } catch (e) {
      if (achados.length) {
        assentar(achados, ` ${e instanceof Error ? e.message : 'A Cát.IA não pôde ajudar.'}`);
      } else {
        setErro(e instanceof Error ? e.message : 'Não consegui ler este texto.');
      }
    } finally {
      setAAnalisar(false);
      setOcupado(null);
    }
  }

  // ── sair daqui: um zip, ou guardado em Carrosséis ──
  const [arrastado, setArrastado] = useState<{ c: number; i: number } | null>(null);

  async function descarregarSlide(ci: number, si: number) {
    setOcupado(`a desenhar o slide ${si + 1}`);
    try {
      const blob = await slideParaBlob({ ...opcoesDe(ci, si), escala: 3 });
      if (blob) descarregar(blob, `${limpo(carrosseis[ci].titulo)}-slide-${si + 1}.png`);
    } finally {
      setOcupado(null);
    }
  }

  async function descarregarTudo() {
    if (!escolhidosIdx.length) return;
    setErro(null);
    const zip = new JSZip();
    try {
      for (const ci of escolhidosIdx) {
        const c = carrosseis[ci];
        const pasta = escolhidosIdx.length > 1 ? zip.folder(limpo(c.titulo))! : zip;
        for (let si = 0; si < c.slides.length; si++) {
          setOcupado(`${limpo(c.titulo)} · slide ${si + 1}/${c.slides.length}`);
          const blob = await slideParaBlob({ ...opcoesDe(ci, si), escala: 3 });
          if (blob) {
            pasta.file(`${String(si + 1).padStart(2, '0')}-${limpo(c.titulo)}.png`, blob);
          }
        }
        pasta.file('legenda.txt', [c.titulo, '', ...c.slides.map(semMarcas)].join('\n\n'));
      }
      setOcupado('a fechar o zip');
      const blob = await zip.generateAsync({ type: 'blob' });
      const nome =
        escolhidosIdx.length === 1
          ? `${limpo(carrosseis[escolhidosIdx[0]].titulo)}.zip`
          : `carrosseis-${new Date().toISOString().slice(0, 10)}.zip`;
      descarregar(blob, nome);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui montar o zip.');
    } finally {
      setOcupado(null);
    }
  }

  const totalDeSlides = escolhidosIdx.reduce((a, ci) => a + carrosseis[ci].slides.length, 0);

  return (
    <>
      <PageHeader
        title="Fábrica de carrosséis"
        subtitle="Colas o texto, escolhes o visual, sais com os slides. Cada um pode ser afinado sozinho."
      />

      {/* ── os três passos ────────────────────────────── */}
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
        <button
          onClick={() => setErro(null)}
          className="mb-4 block w-full rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-left text-sm text-rose-800"
        >
          {erro} <span className="opacity-60">— clica para fechar</span>
        </button>
      )}

      {ocupado && (
        <div className="mb-4">
          <Spinner label={ocupado} />
        </div>
      )}

      {/* ── 1. cola o teu texto ───────────────────────── */}
      {passo === 1 && (
        <>
          <Card className="mb-5">
            <label className="label">Cola o teu texto</label>
            <p className="mb-3 text-sm text-muted">
              Cola a resposta da Cát.IA com os slides, ou importa um ficheiro —
              PDF, Word, texto. O resto é connosco.
            </p>
            <textarea
              className="input min-h-[340px] text-[15px]"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={'Slide 1: …\nSlide 2: …'}
            />
            {aviso && (
              <p className={`mt-2 text-sm ${aviso.ok ? 'font-medium text-ink' : 'text-rose-700'}`}>
                {aviso.msg}
              </p>
            )}

            {carrosseis.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="text-[13px] font-semibold">Carrosséis detetados</span>
                  <button
                    onClick={() => setEscolhidos(carrosseis.map((_, i) => i))}
                    className="text-xs font-semibold text-rosa"
                  >
                    Selecionar todos
                  </button>
                  <button
                    onClick={() => setEscolhidos([ativo])}
                    className="text-xs font-semibold text-muted"
                  >
                    Só o atual
                  </button>
                  <span className="ml-auto text-xs text-muted">
                    {escolhidosIdx.length} selecionado{escolhidosIdx.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {carrosseis.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => setAtivo(i)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                        i === ativo ? 'border-rosa bg-rosaSuave' : 'border-sand'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={escolhidosIdx.includes(i)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() =>
                          setEscolhidos((p) =>
                            p.includes(i)
                              ? p.filter((x) => x !== i)
                              : [...p, i].sort((a, b) => a - b),
                          )
                        }
                        aria-label={`Selecionar ${c.titulo}`}
                      />
                      <span className="truncate text-sm font-semibold">{c.titulo}</span>
                      <span className="ml-auto text-xs text-muted">{c.slides.length} slides</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="btn-fantasma cursor-pointer text-sm">
              <FileText className="h-4 w-4" />
              {aLerFicheiro ? 'A ler o ficheiro…' : 'Importar ficheiro'}
              <input
                type="file"
                accept=".txt,.md,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                hidden
                disabled={aLerFicheiro}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) await importar(f);
                }}
              />
            </label>
            <div className="flex-1" />
            <button onClick={analisar} className="btn-secundario text-sm" disabled={aAnalisar}>
              <Search className="h-4 w-4" /> {aAnalisar ? 'A analisar…' : 'Analisar texto'}
            </button>
            <button
              onClick={() => (carrosseis.length ? setPasso(2) : analisar())}
              className="btn-primario text-sm"
            >
              Continuar para o estilo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* ── 2. escolhe o visual ───────────────────────── */}
      {passo === 2 && (
        <>
          <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-[1fr_320px]">
            <div>
              {carrosseis.length > 1 && (
                <Card className="mb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[13px] font-semibold">Aplicar estilo e fundo a:</span>
                    <div className="inline-flex rounded-xl border border-sand p-1">
                      {(
                        [
                          ['todos', 'Todos os carrosséis'],
                          ['estes', 'Carrosséis selecionados'],
                        ] as const
                      ).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => setAmbito(v)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                            ambito === v ? 'bg-rosa text-white' : 'text-muted'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {ambito === 'estes' && (
                    <div className="mt-3">
                      <div className="mb-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>{alvosDoEstilo.length} selecionado(s)</span>
                        <button
                          className="underline"
                          onClick={() => setAlvos(carrosseis.map((_, i) => i))}
                        >
                          Selecionar todos
                        </button>
                        <button className="underline" onClick={() => setAlvos([ativo])}>
                          Só o atual
                        </button>
                      </div>
                      <div className="max-h-44 overflow-y-auto rounded-xl border border-sand p-1">
                        {carrosseis.map((c, i) => (
                          <label
                            key={i}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                              alvosDoEstilo.includes(i) ? 'bg-rosaSuave' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={alvosDoEstilo.includes(i)}
                              onChange={() =>
                                setAlvos((p) => {
                                  const n = p.includes(i)
                                    ? p.filter((x) => x !== i)
                                    : [...p, i].sort((a, b) => a - b);
                                  if (n.length) setAtivo(n[0]);
                                  return n;
                                })
                              }
                            />
                            <span className="truncate">{c.titulo}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* estilos guardados */}
              <Seccao
                id="estilo"
                abertas={abertas}
                alternar={alternar}
                titulo="Estilo guardado"
                nota={estiloSelecionado.nome}
              >
                {estilos.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => escolherEstilo(e.id)}
                    className={`mb-2 flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 last:mb-0 transition ${
                      e.id === estiloSelecionado.id ? 'border-rosa bg-rosaSuave' : 'border-sand'
                    }`}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded"
                      style={{ background: e.corFundo }}
                    />
                    <span className="truncate text-sm">{e.nome}</span>
                    <span className="ml-auto flex items-center gap-1">
                      <Mini
                        label="Editar"
                        onClick={() => setRascunhoEstilo(normalizar(e))}
                        icone={<Pencil className="h-3.5 w-3.5" />}
                      />
                      <Mini
                        label="Duplicar"
                        onClick={() => {
                          const novo = {
                            ...normalizar(e),
                            id: `e${Date.now()}`,
                            nome: `${e.nome} (cópia)`,
                          };
                          gravarEstilos([...estilos, novo]);
                          setEstiloId(novo.id);
                        }}
                        icone={<Copy className="h-3.5 w-3.5" />}
                      />
                      {estilos.length > 1 && (
                        <Mini
                          label="Remover"
                          onClick={() => {
                            const resto = estilos.filter((x) => x.id !== e.id);
                            gravarEstilos(resto);
                            if (e.id === estiloId) setEstiloId(resto[0].id);
                          }}
                          icone={<Trash2 className="h-3.5 w-3.5" />}
                        />
                      )}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setRascunhoEstilo({
                      ...normalizar(ESTILOS_BASE[0]),
                      id: `e${Date.now()}`,
                      nome: 'Novo estilo',
                    })
                  }
                  className="mt-3 w-full rounded-xl border border-dashed border-rosa px-3 py-2.5 text-sm font-semibold text-rosa"
                >
                  + Criar estilo
                </button>
              </Seccao>

              {/* fundo */}
              <Seccao
                id="fundo"
                abertas={abertas}
                alternar={alternar}
                titulo="Fundo"
                nota={
                  modoFundo === 'cor'
                    ? `cor ${estiloSelecionado.corFundo}`
                    : fotoDeFundo
                      ? 'foto'
                      : 'sem foto'
                }
              >
                <div className="mb-4 inline-flex rounded-xl border border-sand p-1">
                  {(['cor', 'foto'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setModoFundo(m)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${
                        modoFundo === m ? 'bg-rosa text-white' : 'text-muted'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {modoFundo === 'cor' ? (
                  <div className="flex flex-wrap gap-2">
                    {CORES_FUNDO.map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          gravarEstilos(
                            estilos.map((e) =>
                              e.id === estiloSelecionado.id ? { ...e, corFundo: c } : e,
                            ),
                          )
                        }
                        className={`h-9 w-9 rounded-lg border-2 transition ${
                          estiloSelecionado.corFundo === c ? 'border-rosa' : 'border-sand'
                        }`}
                        style={{ background: c }}
                        aria-label={`Fundo ${c}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setBibliotecaPara({ tipo: 'fundo' })}
                      className="btn-secundario text-sm"
                    >
                      <Images className="h-4 w-4" /> Biblioteca de fotos
                    </button>
                    {fotoDeFundo && (
                      <button
                        onClick={() => escolherFoto(null)}
                        className="btn-fantasma text-sm"
                      >
                        <X className="h-4 w-4" /> Tirar a foto
                      </button>
                    )}
                    <p className="w-full text-xs leading-relaxed text-muted">
                      No passo seguinte podes trocar a foto slide a slide.
                    </p>
                  </div>
                )}
              </Seccao>
            </div>

            {/* pré-visualização */}
            <div>
              <h3 className="mb-1.5 text-sm font-semibold">Pré-visualização</h3>
              <SlidePreview
                estilo={estiloDoCarrossel(ativo)}
                foto={modoFundo === 'foto' ? fotoDeFundo : null}
                texto={
                  carrosseis[ativo]?.slides[0] ||
                  'Cola o teu texto no passo 1 para veres os slides a sério.'
                }
                handle={handle || undefined}
              />
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button onClick={() => setPasso(1)} className="btn-fantasma text-sm">
              Voltar
            </button>
            <div className="flex-1" />
            <button onClick={() => setPasso(3)} className="btn-primario text-sm">
              Continuar para os slides <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* ── 3. os teus slides ─────────────────────────── */}
      {passo === 3 && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button onClick={() => setPasso(2)} className="btn-fantasma text-sm">
              <ChevronLeft className="h-4 w-4" /> Voltar ao estilo
            </button>
            <p className="text-sm text-muted">
              {escolhidosIdx.length
                ? `${escolhidosIdx.length === 1 ? '1 carrossel' : `${escolhidosIdx.length} carrosséis`} · ${totalDeSlides} slides. Podes afinar cada um.`
                : 'Ainda não há slides — volta ao passo 1 e analisa o texto.'}
            </p>
          </div>

          {carrosseis.length > 1 && (
            <Card className="mb-6">
              <div className="mb-2.5 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Que carrosséis levar daqui
                </span>
                <button
                  onClick={() => setEscolhidos(carrosseis.map((_, i) => i))}
                  className="text-xs font-semibold text-rosa"
                >
                  Todos
                </button>
                <button
                  onClick={() => setEscolhidos([escolhidosIdx[0] ?? 0])}
                  className="text-xs font-semibold text-muted"
                >
                  Só um
                </button>
                <span className="ml-auto text-xs text-muted">
                  {escolhidosIdx.length} de {carrosseis.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {carrosseis.map((c, i) => {
                  const dentro = escolhidosIdx.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => alternarCarrossel(i)}
                      aria-pressed={dentro}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                        dentro ? 'border-rosa bg-rosaSuave font-semibold' : 'border-sand text-muted'
                      }`}
                    >
                      {dentro ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-rosa" />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0 rounded border border-sand" />
                      )}
                      <span className="max-w-[180px] truncate">{c.titulo}</span>
                      <span className="text-xs font-normal text-muted">{c.slides.length}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-muted">
                Só os escolhidos aparecem aqui em baixo — e só esses vão no zip ou
                para a biblioteca.
              </p>
            </Card>
          )}

          {!!escolhidosIdx.length && (
            <Card className="mb-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Estilo guardado — aplicar a todos os slides
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {estilos.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => aplicarEstiloATodos(e.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                      e.id === estiloId ? 'border-rosa font-semibold' : 'border-sand'
                    }`}
                  >
                    <span className="h-4 w-4 shrink-0 rounded" style={{ background: e.corFundo }} />
                    <span className="max-w-[140px] truncate">{e.nome}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {escolhidosIdx.map((ci) => (
            <div key={ci} className="mb-8">
              <div className="mb-2.5 flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-bold">{carrosseis[ci].titulo}</h3>
                <span className="text-xs text-muted">{carrosseis[ci].slides.length} slides</span>
                <button
                  onClick={() => adicionarSlide(ci, carrosseis[ci].slides.length - 1)}
                  disabled={carrosseis[ci].slides.length >= MAX_SLIDES}
                  title={
                    carrosseis[ci].slides.length >= MAX_SLIDES
                      ? `Um carrossel leva no máximo ${MAX_SLIDES} slides.`
                      : 'Acrescentar um slide no fim'
                  }
                  className="ml-auto flex items-center gap-1 rounded-xl border border-sand px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-rosa disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sand"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar slide
                </button>
                <select
                  value={estiloPorCarrossel[ci] ?? estiloId}
                  onChange={(e) => aplicarEstiloAoCarrossel(ci, e.target.value)}
                  className="rounded-xl border border-sand px-2 py-1 text-xs"
                  aria-label="Estilo deste carrossel"
                >
                  {estilos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {carrosseis[ci].slides.map((slide, si) => (
                  <CartaoDeSlide
                    key={si}
                    n={si + 1}
                    texto={slide}
                    estilo={estiloDoSlide(ci, si)}
                    foto={fotoDoSlide(ci, si)}
                    handle={handle || undefined}
                    aArrastar={arrastado?.c === ci && arrastado?.i === si}
                    aoComecarArrasto={() => setArrastado({ c: ci, i: si })}
                    aoAcabarArrasto={() => setArrastado(null)}
                    aoLargarAqui={() => {
                      if (arrastado && arrastado.c === ci) moverSlide(ci, arrastado.i, si);
                      setArrastado(null);
                    }}
                    aoMudarTexto={(v) => mudarTexto(ci, si, v)}
                    aoDescarregar={() => descarregarSlide(ci, si)}
                    novo={slideNovo?.c === ci && slideNovo?.s === si}
                    aoAdicionarASeguir={
                      carrosseis[ci].slides.length < MAX_SLIDES
                        ? () => adicionarSlide(ci, si)
                        : undefined
                    }
                    aoEscolherFoto={() => {
                      setFotoParaTodos(false);
                      setBibliotecaPara({ tipo: 'slide', c: ci, s: si });
                    }}
                    aoAplicarFotoATodos={
                      fotoDoSlide(ci, si) && carrosseis[ci].slides.length > 1
                        ? () => aplicarFotoAoCarrossel(ci, fotoDoSlide(ci, si) as string)
                        : undefined
                    }
                    aoTirarFoto={
                      fotosDeSlide[chave(ci, si)]
                        ? () =>
                            setFotosDeSlide((p) => {
                              const n = { ...p };
                              delete n[chave(ci, si)];
                              return n;
                            })
                        : undefined
                    }
                    aoMudarTamanho={(d) =>
                      ajustar(ci, si, { d: (ajustes[chave(ci, si)]?.d ?? 0) + d })
                    }
                    aoAlternarNegrito={() =>
                      ajustar(ci, si, { negrito: !estiloDoSlide(ci, si).negrito })
                    }
                    aoAlinhar={(a) => ajustar(ci, si, { alinhamento: a })}
                    aoRepor={
                      ajustes[chave(ci, si)] ? () => reporTexto(ci, si) : undefined
                    }
                    aoApagar={
                      carrosseis[ci].slides.length > 1 ? () => apagarSlide(ci, si) : undefined
                    }
                  />
                ))}

                {carrosseis[ci].slides.length < MAX_SLIDES ? (
                  <button
                    onClick={() => adicionarSlide(ci, carrosseis[ci].slides.length - 1)}
                    className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sand p-4 text-sm font-semibold text-muted transition hover:border-rosa hover:bg-rosaSuave/40 hover:text-rosa"
                  >
                    <Plus className="h-7 w-7" />
                    Adicionar slide
                    <span className="text-xs font-normal">
                      {carrosseis[ci].slides.length} de {MAX_SLIDES}
                    </span>
                  </button>
                ) : (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-sand p-4 text-center text-xs leading-relaxed text-muted">
                    <span className="font-semibold">{MAX_SLIDES} slides</span>
                    Um carrossel não leva mais do que isto. Apaga um para
                    acrescentares outro.
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button onClick={() => setPasso(2)} className="btn-fantasma text-sm">
              <ChevronLeft className="h-4 w-4" /> Voltar ao estilo
            </button>
            <div className="flex-1" />
            <button
              onClick={descarregarTudo}
              className="btn-primario text-sm"
              disabled={!escolhidosIdx.length || !!ocupado}
            >
              <Download className="h-4 w-4" /> Descarregar em zip
            </button>
          </div>
        </>
      )}

      {/* ── o editor de estilo ────────────────────────── */}
      {rascunhoEstilo && (
        <EditorDeEstilo
          rascunho={rascunhoEstilo}
          setRascunho={setRascunhoEstilo}
          aoFechar={() => setRascunhoEstilo(null)}
          aoGuardar={() => {
            const existe = estilos.some((e) => e.id === rascunhoEstilo.id);
            gravarEstilos(
              existe
                ? estilos.map((e) => (e.id === rascunhoEstilo.id ? rascunhoEstilo : e))
                : [...estilos, rascunhoEstilo],
            );
            setEstiloId(rascunhoEstilo.id);
            setRascunhoEstilo(null);
          }}
          foto={modoFundo === 'foto' ? fotoDeFundo : null}
          texto={carrosseis[ativo]?.slides[0] ?? 'O teu texto aqui'}
          handle={handle || undefined}
          aoEscolherFoto={() => setBibliotecaPara({ tipo: 'fundo' })}
          aoTirarFoto={() => escolherFoto(null)}
        />
      )}

      {/* ── a biblioteca de fotografias ───────────────── */}
      {bibliotecaPara && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm">
          <div className="card flex max-h-[80vh] w-full max-w-2xl flex-col shadow-lift">
            <div className="mb-1 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted" />
              <h2 className="text-base font-semibold">A tua biblioteca</h2>
              <button
                onClick={() => setBibliotecaPara(null)}
                className="ml-auto rounded-full p-1 text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-sm text-muted">
              {bibliotecaPara.tipo === 'fundo'
                ? 'Esta fotografia fica no fundo de todos os slides.'
                : fotoParaTodos
                  ? 'Esta fotografia fica no fundo de todos os slides deste carrossel.'
                  : `Esta fotografia fica só no slide ${bibliotecaPara.s + 1}.`}
            </p>

            {bibliotecaPara.tipo === 'slide' &&
              (carrosseis[bibliotecaPara.c]?.slides.length ?? 0) > 1 && (
                <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-sand px-3 py-2 text-sm text-ink transition hover:border-rosa">
                  <input
                    type="checkbox"
                    checked={fotoParaTodos}
                    onChange={(e) => setFotoParaTodos(e.target.checked)}
                    className="h-4 w-4 accent-rosa"
                  />
                  Aplicar a todos os slides deste carrossel
                </label>
              )}

            {fotos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                Ainda não tens fotografias. Podes carregá-las em Biblioteca → Fotografias.
              </p>
            ) : (
              <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 overflow-y-auto">
                {fotos.map((f) =>
                  f.url ? (
                    <button
                      key={f.id}
                      onClick={() => escolherFoto(f.url)}
                      className="overflow-hidden rounded-xl border border-sand transition hover:border-rosa"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" className="aspect-square w-full object-cover" />
                    </button>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Uma secção que se abre e fecha, e se lembra de como ficou. */
function Seccao({
  id,
  abertas,
  alternar,
  titulo,
  nota,
  children,
}: {
  id: string;
  abertas: string[];
  alternar: (id: string) => void;
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  const aberta = abertas.includes(id);
  return (
    <Card className="mb-4">
      <button
        onClick={() => alternar(id)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="text-sm font-semibold">{titulo}</span>
        {nota && <span className="truncate text-xs text-muted">{nota}</span>}
        <ChevronDown
          className={`ml-auto h-4 w-4 text-muted transition ${aberta ? 'rotate-180' : ''}`}
        />
      </button>
      {aberta && <div className="mt-4">{children}</div>}
    </Card>
  );
}

function Mini({
  label,
  onClick,
  icone,
}: {
  label: string;
  onClick: () => void;
  icone: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
    >
      {icone}
    </button>
  );
}

/** Um botão pequeno da barra de texto do slide. */
function Txt({
  onClick,
  ativo,
  label,
  children,
}: {
  onClick?: () => void;
  ativo?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition ${
        ativo ? 'bg-rosa text-white' : 'text-muted hover:bg-creme hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Um slide, com tudo o que se lhe pode fazer sem sair daqui:
 * trocar a foto, escrever por cima, mudar o tamanho da letra, o negrito e o
 * alinhamento, arrastá-lo para outro lugar, ou deitá-lo fora.
 */
function CartaoDeSlide({
  n,
  texto,
  estilo,
  foto,
  handle,
  aArrastar,
  aoComecarArrasto,
  aoAcabarArrasto,
  aoLargarAqui,
  aoMudarTexto,
  aoDescarregar,
  aoEscolherFoto,
  aoAplicarFotoATodos,
  aoTirarFoto,
  aoMudarTamanho,
  aoAlternarNegrito,
  aoAlinhar,
  aoRepor,
  aoApagar,
  aoAdicionarASeguir,
  novo,
}: {
  n: number;
  texto: string;
  estilo: Estilo;
  foto: string | null;
  handle?: string;
  aArrastar: boolean;
  aoComecarArrasto: () => void;
  aoAcabarArrasto: () => void;
  aoLargarAqui: () => void;
  aoMudarTexto: (v: string) => void;
  aoDescarregar: () => void;
  aoEscolherFoto: () => void;
  aoAplicarFotoATodos?: () => void;
  aoAdicionarASeguir?: () => void;
  /** Acabou de nascer: abre logo o campo de escrita. */
  novo?: boolean;
  aoTirarFoto?: () => void;
  aoMudarTamanho: (d: number) => void;
  aoAlternarNegrito: () => void;
  aoAlinhar: (a: Alinhamento) => void;
  aoRepor?: () => void;
  aoApagar?: () => void;
}) {
  const [aEscrever, setAEscrever] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const barra = useRef<HTMLDivElement>(null);

  /**
   * Marca as palavras selecionadas.
   *
   * As marcas vivem dentro do texto (ver studio-texto.ts), por isso marcar é
   * escrever à volta do que está selecionado. A seleção é reposta a seguir —
   * senão o cursor saltava para o princípio a cada carregar de botão, e não
   * se conseguiria pôr negrito e sublinhado nas mesmas palavras.
   */
  function marcar(marca: Marca) {
    const el = campo.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    if (a === null || b === null || a === b) return;
    const r = envolver(texto, a, b, marca);
    aoMudarTexto(r.texto);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.inicio, r.fim);
    });
  }

  useEffect(() => {
    if (aEscrever) campo.current?.focus();
  }, [aEscrever]);

  useEffect(() => {
    if (novo) setAEscrever(true);
  }, [novo]);

  return (
    <div
      draggable
      onDragStart={aoComecarArrasto}
      onDragEnd={aoAcabarArrasto}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        aoLargarAqui();
      }}
      className={`rounded-2xl border p-2 transition ${
        aArrastar ? 'border-rosa opacity-50' : 'border-sand'
      }`}
    >
      <SlidePreview estilo={estilo} foto={foto} texto={texto} handle={handle} />

      <div className="mt-2 flex flex-wrap items-center gap-1 px-1 text-[11px] text-muted">
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab" />
        <span className="whitespace-nowrap font-semibold">Slide {n}</span>
        <span className="ml-auto flex flex-wrap items-center justify-end gap-0.5">
          <Mini label="Foto deste slide" onClick={aoEscolherFoto} icone={<ImageIcon className="h-3.5 w-3.5" />} />
          {aoAplicarFotoATodos && (
            <Mini
              label="Aplicar esta foto a todos os slides"
              onClick={aoAplicarFotoATodos}
              icone={<Copy className="h-3.5 w-3.5" />}
            />
          )}
          {aoTirarFoto && (
            <Mini label="Repor a foto do carrossel" onClick={aoTirarFoto} icone={<RotateCcw className="h-3.5 w-3.5" />} />
          )}
          <Mini
            label="Editar o texto"
            onClick={() => setAEscrever((v) => !v)}
            icone={<Pencil className="h-3.5 w-3.5" />}
          />
          <Mini label="Descarregar este slide" onClick={aoDescarregar} icone={<Download className="h-3.5 w-3.5" />} />
          {aoAdicionarASeguir && (
            <Mini
              label="Acrescentar um slide a seguir a este"
              onClick={aoAdicionarASeguir}
              icone={<Plus className="h-3.5 w-3.5" />}
            />
          )}
          {aoApagar && <Mini label="Eliminar este slide" onClick={aoApagar} icone={<Trash2 className="h-3.5 w-3.5" />} />}
        </span>
      </div>

      {aEscrever && (
        <div className="mt-2">
          <div ref={barra} className="mb-1.5 flex items-center gap-0.5">
            <Txt label="Negrito nas palavras selecionadas" onClick={() => marcar('negrito')}>
              <Bold className="h-3.5 w-3.5" />
            </Txt>
            <Txt label="Itálico nas palavras selecionadas" onClick={() => marcar('italico')}>
              <Italic className="h-3.5 w-3.5" />
            </Txt>
            <Txt label="Sublinhado nas palavras selecionadas" onClick={() => marcar('sublinhado')}>
              <Underline className="h-3.5 w-3.5" />
            </Txt>
            <span className="ml-1 text-[10px] leading-tight text-muted">
              seleciona e carrega
            </span>
          </div>
          <textarea
            ref={campo}
            value={texto}
            onChange={(e) => aoMudarTexto(e.target.value)}
            onBlur={(e) => {
              // sair para os botões de marcar não é sair do campo
              if (e.relatedTarget && barra.current?.contains(e.relatedTarget as Node)) return;
              setAEscrever(false);
            }}
            className="input min-h-[80px] text-[13px]"
          />
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-0.5 border-t border-sand px-1 pt-1.5">
        <Txt label="Diminuir o texto" onClick={() => aoMudarTamanho(-1)}>
          A−
        </Txt>
        <Txt label="Aumentar o texto" onClick={() => aoMudarTamanho(1)}>
          A+
        </Txt>
        <Txt label="Negrito" onClick={aoAlternarNegrito} ativo={estilo.negrito}>
          <Bold className="h-3.5 w-3.5" />
        </Txt>
        <Txt
          label="Alinhar à esquerda"
          onClick={() => aoAlinhar('esquerda')}
          ativo={estilo.alinhamento === 'esquerda'}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Txt>
        <Txt label="Centrar" onClick={() => aoAlinhar('centro')} ativo={estilo.alinhamento === 'centro'}>
          <AlignCenter className="h-3.5 w-3.5" />
        </Txt>
        <Txt
          label="Alinhar à direita"
          onClick={() => aoAlinhar('direita')}
          ativo={estilo.alinhamento === 'direita'}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Txt>
        <Txt
          label="Justificar"
          onClick={() => aoAlinhar('justificado')}
          ativo={estilo.alinhamento === 'justificado'}
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </Txt>
        {aoRepor && (
          <Txt label="Repor o texto do estilo" onClick={aoRepor}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Txt>
        )}
      </div>
    </div>
  );
}
