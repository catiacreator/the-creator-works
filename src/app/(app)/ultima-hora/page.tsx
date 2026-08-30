'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Radio,
  RefreshCw,
  Trash2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  BookOpen,
  ListOrdered,
  X,
  Image as ImageIcon,
  PenTool,
  Newspaper,
  Download,
  Flame,
  Save,
} from 'lucide-react';
import { Card, Dialogo, Empty, PageHeader, Separador, Spinner } from '@/components/ui';
import { REGIOES, regiaoDoPais, type Regiao } from '@/lib/regioes';
import type { PhotoRow } from '@/lib/types';

interface Angulo {
  tipo?: 'historia' | 'lista';
  titulo: string;
  gancho: string;
}

interface Assunto {
  id: string;
  categoria: string;
  assunto: string;
  fonte: string | null;
  url: string | null;
  porque: string;
  angulos: Angulo[];
  created_at: string;
}

interface Gancho {
  tipologia: string;
  gancho: string;
}

type Foto = PhotoRow & { url: string | null };

const QUANDO = (iso: string) => {
  const horas = Math.round((Date.now() - new Date(iso).getTime()) / 36e5);
  if (horas < 1) return 'agora mesmo';
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
};

/**
 * Última hora.
 *
 * Não são as tendências do país — isso traz gente que nunca compra. É o que
 * está a mexer no nicho dela, com dois ângulos por assunto e o caminho até ao
 * carrossel a passar sempre pelo gancho.
 */
export default function UltimaHoraPage() {
  const router = useRouter();
  const [regiao, setRegiao] = useState<Regiao>('global');
  const [regiaoLida, setRegiaoLida] = useState(false);
  const [assuntos, setAssuntos] = useState<Assunto[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aProcurar, setAProcurar] = useState<'nicho' | 'quentes' | null>(null);
  const [palavras, setPalavras] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aApagar, setAApagar] = useState<Assunto | null>(null);

  // o passo dos ganchos
  const [alvo, setAlvo] = useState<{ assunto: Assunto; angulo: Angulo } | null>(null);
  const [ganchos, setGanchos] = useState<Gancho[] | null>(null);
  const [escolhido, setEscolhido] = useState<string>('');
  const [instrucao, setInstrucao] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [fotoId, setFotoId] = useState('');
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [passo, setPasso] = useState<'ganchos' | 'onde'>('ganchos');
  /** Os slides escritos a partir do gancho, à espera de destino. */
  const [escritos, setEscritos] = useState<{ titulo: string; slides: string[] } | null>(null);
  const [quantos, setQuantos] = useState(8);
  const [comImagens, setComImagens] = useState(false);
  const [aSair, setASair] = useState<null | (() => void)>(null);
  const [ocupado, setOcupado] = useState('');

  // o país dela, escolhido em Sobre mim, é o separador que abre
  /**
   * Sair com um carrossel escrito e por usar é perder trabalho feito.
   * O aviso do browser trata da aba fechada; para os links de dentro da app,
   * o clique é apanhado aqui e a decisão é dela.
   */
  useEffect(() => {
    if (!escritos) return;

    const aoFechar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const aoClicar = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest?.('a');
      const destino = link?.getAttribute('href');
      if (!destino || !destino.startsWith('/') || destino === '/ultima-hora') return;
      e.preventDefault();
      e.stopPropagation();
      setASair(() => () => router.push(destino));
    };

    window.addEventListener('beforeunload', aoFechar);
    document.addEventListener('click', aoClicar, true);
    return () => {
      window.removeEventListener('beforeunload', aoFechar);
      document.removeEventListener('click', aoClicar, true);
    };
  }, [escritos, router]);

  useEffect(() => {
    fetch('/api/perfil')
      .then((r) => r.json())
      .then((d) => {
        const dela = regiaoDoPais(d?.briefing?.pais);
        if (dela !== 'global') setRegiao(dela);
      })
      .finally(() => setRegiaoLida(true));
  }, []);

  useEffect(() => {
    if (!regiaoLida) return;
    setACarregar(true);
    fetch(`/api/ultima-hora?regiao=${regiao}`)
      .then((r) => r.json())
      .then((d) => setAssuntos(d.assuntos ?? []))
      .finally(() => setACarregar(false));
  }, [regiao, regiaoLida]);

  useEffect(() => {
    Promise.all([
      fetch('/api/templates').then((r) => r.json()),
      fetch('/api/photos').then((r) => r.json()),
    ]).then(([t, p]) => {
      setTemplates(t.templates ?? []);
      setFotos(p.photos ?? []);
      if (t.templates?.length) setTemplateId(t.templates[0].id);
    });
  }, []);

  async function procurar(modo: 'nicho' | 'quentes') {
    setAProcurar(modo);
    setErro(null);
    try {
      const d = await fetch('/api/ultima-hora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantos: 5, regiao, modo, palavras }),
      }).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      if (!d.assuntos?.length) {
        setErro(
          `Não apanhei nada de novo ${
            REGIOES.find((r) => r.id === regiao)?.label ?? ''
          } desta vez. Volta daqui a umas horas.`,
        );
      }
      setAssuntos((a) => [...(d.assuntos ?? []), ...a]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui ir à procura.');
    } finally {
      setAProcurar(null);
    }
  }

  async function apagar(id: string) {
    await fetch(`/api/ultima-hora?id=${id}`, { method: 'DELETE' });
    setAssuntos((a) => a.filter((x) => x.id !== id));
    setAApagar(null);
  }

  /** Passo 1 do carrossel: nove ganchos para escolher. */
  async function abrirGanchos(assunto: Assunto, angulo: Angulo) {
    setAlvo({ assunto, angulo });
    setGanchos([]);
    setEscolhido(angulo.gancho ?? '');
    setInstrucao('');
    setPasso('ganchos');
    setErro(null);
    setOcupado('A escrever os ganchos…');

    // os três grupos vão ao mesmo tempo e cada um aparece mal chega —
    // ver os primeiros três em quatro segundos vale mais do que ver nove em dez
    const pedidos = [0, 1, 2].map(async (grupo) => {
      const d = await fetch('/api/ganchos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assunto: assunto.assunto,
          contexto: assunto.porque,
          angulo: `${angulo.titulo} — ${angulo.gancho}`,
          grupo,
        }),
      }).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      setGanchos((g) => [...(g ?? []), ...(d.ganchos ?? [])]);
    });

    const resultados = await Promise.allSettled(pedidos);
    if (resultados.every((r) => r.status === 'rejected')) {
      setErro('Não consegui escrever os ganchos. Tenta outra vez.');
    }
    setOcupado('');
  }

  /** Escreve os slides a partir do gancho e pergunta onde os quer montar. */
  async function escrever() {
    if (!alvo || !escolhido.trim()) return;
    setOcupado('A escrever o carrossel…');
    setErro(null);
    try {
      const d = await fetch('/api/ultima-hora/escrever', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gancho: escolhido.trim(),
          assunto: alvo.assunto.assunto,
          contexto: alvo.assunto.porque,
          angulo: `${alvo.angulo.titulo} — ${alvo.angulo.gancho}`,
          instrucao,
          slides: quantos,
        }),
      }).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      setEscritos({ titulo: d.titulo, slides: d.slides });
      setPasso('onde');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui escrever o carrossel.');
    } finally {
      setOcupado('');
    }
  }

  /** As imagens da notícia, quando ela as quiser levar. */
  async function imagensDaNoticia(): Promise<string | null> {
    if (!comImagens || !alvo) return null;
    try {
      const d = await fetch('/api/ultima-hora/imagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alvo.assunto.id, tipo: 'cartao' }),
      }).then((r) => r.json());
      const novas: Foto[] = d.photos ?? [];
      if (novas.length) setFotos((f) => [...novas, ...f]);
      return novas[0]?.url ?? null;
    } catch {
      return null;
    }
  }

  /** Um: abre no editor, com os slides já lá dentro. */
  async function paraOEditor() {
    if (!escritos) return;
    setOcupado('A abrir no editor…');
    setErro(null);
    try {
      const foto = await imagensDaNoticia();
      const d = await fetch('/api/carousels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: escritos.titulo,
          topic: escritos.titulo,
          template_id: templateId || null,
          photo_id: fotoId || null,
          slides: escritos.slides.map((t) => ({ fields: { titulo: t } })),
        }),
      }).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      if (foto) {
        /* a imagem ficou na biblioteca; o editor escolhe-a de lá */
      }
      setEscritos(null);
      router.push(`/editor/${d.carousel.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui abrir no editor.');
      setOcupado('');
    }
  }

  /** Outro: vai para o Carrosséis Creator, já no passo do estilo. */
  async function paraOCreator() {
    if (!escritos) return;
    setOcupado('A levar para o Creator…');
    try {
      const foto = await imagensDaNoticia();
      window.sessionStorage.setItem(
        'estudio-importar',
        JSON.stringify({ ...escritos, foto: foto ?? null }),
      );
      setEscritos(null);
      router.push('/criar-carrosseis');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui levar para o Creator.');
      setOcupado('');
    }
  }

  /** Guardar como rascunho, para não perder o que já está escrito. */
  async function paraOsRascunhos() {
    if (!escritos) return;
    setOcupado('A guardar nos rascunhos…');
    try {
      const d = await fetch('/api/carousels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: escritos.titulo,
          topic: escritos.titulo,
          slides: escritos.slides.map((t) => ({ fields: { titulo: t } })),
        }),
      }).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      setEscritos(null);
      setAlvo(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui guardar.');
    } finally {
      setOcupado('');
    }
  }

  return (
    <>
      <PageHeader
        title="Última hora"
        subtitle="O que está a dar que falar agora, aqui e no mundo. Cada assunto vem com dois ângulos prontos a escrever — e o ângulo aterra sempre no teu mundo, senão é audiência que nunca te compra."
      />

      {/* ── o que procurar, e onde ─────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          className="input w-full sm:w-[420px]"
          value={palavras}
          onChange={(e) => {
            // até cinco referências, separadas por vírgulas
            const partes = e.target.value.split(',');
            setPalavras(partes.length > 5 ? partes.slice(0, 5).join(',') : e.target.value);
          }}
          placeholder="emagrecer a comer doces, comer saudável, alimentação intuitiva…"
          maxLength={200}
          disabled={!!aProcurar}
        />
        <button
          className="btn-primary"
          onClick={() => procurar('quentes')}
          disabled={!!aProcurar}
        >
          {aProcurar === 'quentes' ? (
            <Spinner label="A ver o que arde…" />
          ) : (
            <>
              <Flame className="h-4 w-4" /> As mais quentes agora
            </>
          )}
        </button>
        <button
          className="btn-ghost"
          onClick={() => procurar('nicho')}
          disabled={!!aProcurar}
        >
          {aProcurar === 'nicho' ? (
            <Spinner label="A procurar…" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Só do meu nicho
            </>
          )}
        </button>
        <span className="w-full text-xs text-muted">
          Sem escrever nada, trago as maiores notícias do momento — política, saúde, economia,
          desporto, o que estiver a dar que falar. O ângulo é que volta ao teu mundo. Com
          referências (até cinco, separadas por vírgulas), procuro só sobre elas, do último mês.
        </span>
      </div>

      <Separador
        valor={regiao}
        set={setRegiao}
        opcoes={REGIOES.map((r) => ({ id: r.id, label: r.label }))}
      />

      {erro && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {erro}
        </div>
      )}

      {aCarregar ? (
        <Spinner label="A carregar…" />
      ) : assuntos.length === 0 ? (
        <Empty>
          Ainda não procurei nada{' '}
          {regiao === 'global' ? 'no mundo' : `em ${REGIOES.find((r) => r.id === regiao)?.label}`}.
          Carrega em <strong>as mais quentes agora</strong> para o que está a arder, seja de que
          tema for — ou em <strong>só do meu nicho</strong> se quiseres apenas o teu mundo.
        </Empty>
      ) : (
        <div className="space-y-5">
          {assuntos.map((a) => (
            <Card key={a.id}>
              {/* categoria · fonte · quando */}
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
                <span className="rounded-full bg-creme px-2.5 py-1 font-semibold text-ink">
                  {a.categoria}
                </span>
                {a.fonte && (
                  <span className="inline-flex items-center gap-1">
                    <Radio className="h-3 w-3" /> {a.fonte}
                  </span>
                )}
                <span>· {QUANDO(a.created_at)}</span>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline hover:text-ink"
                  >
                    <ExternalLink className="h-3 w-3" /> ver
                  </a>
                )}
                <button
                  onClick={() => setAApagar(a)}
                  className="ml-auto rounded-lg p-1 text-muted transition hover:bg-rosaSuave hover:text-rosa"
                  title="Não me interessa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <h2 className="mb-1.5 text-[19px] font-semibold leading-snug tracking-tight">
                {a.assunto}
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-muted">{a.porque}</p>

              <div className="grid gap-3 md:grid-cols-2">
                {(a.angulos ?? []).map((ang, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl border border-sand bg-creme/50 p-4"
                  >
                    <span className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                      {ang.tipo === 'lista' ? (
                        <>
                          <ListOrdered className="h-3.5 w-3.5" /> Lista
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-3.5 w-3.5" /> História
                        </>
                      )}
                    </span>
                    <p className="mb-1.5 text-sm font-medium leading-snug">{ang.titulo}</p>
                    <p className="mb-4 text-sm italic leading-relaxed text-muted">
                      “{ang.gancho}”
                    </p>
                    <button
                      className="btn-ghost mt-auto !py-2 text-xs"
                      onClick={() => abrirGanchos(a, ang)}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Criar carrossel
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── escolher o gancho, e só depois escrever ─────────────── */}
      {alvo && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-6 backdrop-blur-sm">
          <div className="card my-6 w-full max-w-3xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  {alvo.assunto.categoria} · {alvo.angulo.tipo === 'lista' ? 'Lista' : 'História'}
                </p>
                <h2 className="text-lg font-semibold leading-snug">{alvo.angulo.titulo}</h2>
              </div>
              <button
                onClick={() => setAlvo(null)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
                disabled={!!ocupado}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {passo === 'ganchos' && (
              <>
                <p className="mb-3 text-sm text-muted">
                  O gancho decide tudo. Escolhe um — e muda-o à mão se quiseres. É ele que vai
                  mandar no carrossel inteiro, não só na capa.
                </p>

                {ocupado && !ganchos?.length ? (
                  <Spinner label={ocupado} />
                ) : (
                  <div className="mb-4 max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                    {(ganchos ?? []).map((g, i) => (
                      <button
                        key={i}
                        onClick={() => setEscolhido(g.gancho)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          escolhido === g.gancho
                            ? 'border-ink bg-creme'
                            : 'border-sand hover:border-ink/40'
                        }`}
                      >
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                          {g.tipologia}
                        </span>
                        <span className="text-sm leading-snug">{g.gancho}</span>
                      </button>
                    ))}
                    {ocupado && (
                      <div className="px-1 py-2">
                        <Spinner label="e mais alguns a caminho…" />
                      </div>
                    )}
                  </div>
                )}

                <label className="label">O gancho, como vai ficar na capa</label>
                <textarea
                  className="input mb-4 min-h-[70px]"
                  value={escolhido}
                  onChange={(e) => setEscolhido(e.target.value)}
                  placeholder="Escolhe um acima, ou escreve o teu"
                />

                <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <label className="label">Alguma coisa que eu deva saber</label>
                    <input
                      className="input"
                      value={instrucao}
                      onChange={(e) => setInstrucao(e.target.value)}
                      placeholder="fala do caso da mentorada que… · não menciones preços"
                    />
                  </div>
                  <div>
                    <label className="label">Slides</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setQuantos(n)}
                          className={quantos === n ? 'chip-on' : 'chip-off'}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="btn-ghost !py-2 text-xs"
                    onClick={() => abrirGanchos(alvo.assunto, alvo.angulo)}
                    disabled={!!ocupado}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Outros nove
                  </button>
                  <button
                    className="btn-escuro ml-auto px-6 py-3"
                    disabled={!escolhido.trim() || !!ocupado}
                    onClick={escrever}
                  >
                    {ocupado ? (
                      <Spinner label={ocupado} />
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4" /> Escrever o carrossel
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {passo === 'onde' && escritos && (
              <>
                <div className="mb-4 rounded-xl border border-ink/15 bg-creme px-4 py-3">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                    {escritos.slides.length} slides escritos · capa
                  </span>
                  <p className="text-sm">{escritos.slides[0]}</p>
                </div>

                <p className="mb-3 text-sm text-muted">Onde queres montá-lo?</p>

                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={paraOEditor}
                    disabled={!!ocupado}
                    className="flex flex-col rounded-2xl border border-sand bg-white p-5 text-left transition hover:border-ink/40 hover:shadow-soft disabled:opacity-60"
                  >
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-creme text-ink">
                      <PenTool className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <span className="mb-1 text-[16px] font-semibold">Criar no editor</span>
                    <span className="text-sm leading-relaxed text-muted">
                      Os slides entram no editor com o texto de cada um. Mexes em tudo à mão —
                      posição, cor, fotografia, slide a slide.
                    </span>
                  </button>

                  <button
                    onClick={paraOCreator}
                    disabled={!!ocupado}
                    className="flex flex-col rounded-2xl border border-sand bg-white p-5 text-left transition hover:border-ink/40 hover:shadow-soft disabled:opacity-60"
                  >
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-creme text-ink">
                      <Flame className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <span className="mb-1 text-[16px] font-semibold">
                      Criar no Carrosséis Creator
                    </span>
                    <span className="text-sm leading-relaxed text-muted">
                      Os slides entram já no passo do estilo. Escolhes o aspeto e a fotografia, e
                      descarregas em 4K.
                    </span>
                  </button>
                </div>

                {alvo.assunto.url && (
                  <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={comImagens}
                      onChange={(e) => setComImagens(e.target.checked)}
                      className="h-4 w-4 accent-rosa"
                    />
                    Levar também a manchete desenhada e as fotografias da notícia
                  </label>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-sand pt-3">
                  <button
                    className="btn-ghost !py-2 text-xs"
                    onClick={() => setPasso('ganchos')}
                    disabled={!!ocupado}
                  >
                    Voltar ao gancho
                  </button>
                  {ocupado && <Spinner label={ocupado} />}
                  <button
                    className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted underline transition hover:text-ink"
                    onClick={paraOsRascunhos}
                    disabled={!!ocupado}
                  >
                    <Save className="h-3.5 w-3.5" /> guardar nos rascunhos
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {aSair && (
        <Dialogo
          titulo="Levas o carrossel contigo?"
          texto="Já está escrito mas ainda não foi montado. Posso guardá-lo nos rascunhos, em Carrosséis, para o continuares quando quiseres."
          confirmar="Guardar e sair"
          ocupado={!!ocupado}
          aoConfirmar={async () => {
            const irEmbora = aSair;
            await paraOsRascunhos();
            setASair(null);
            irEmbora?.();
          }}
          aoFechar={() => {
            const irEmbora = aSair;
            setASair(null);
            setEscritos(null);
            irEmbora?.();
          }}
        />
      )}

      {aApagar && (
        <Dialogo
          titulo="Tirar este assunto da lista?"
          texto="Deixa de aparecer aqui. Se voltar a estar a dar que falar, aparece outra vez na próxima procura."
          confirmar="Tirar"
          perigo
          aoConfirmar={() => apagar(aApagar.id)}
          aoFechar={() => setAApagar(null)}
        />
      )}
    </>
  );
}
