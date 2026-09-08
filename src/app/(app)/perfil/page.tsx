'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Target,
  Users,
  Compass,
  Trophy,
  Download,
  Eye,
  Save,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { TextoRico } from '@/components/texto-rico';
import { Wizard } from '@/components/wizard';
import {
  OBRIGATORIOS,
  SEPARADORES,
  emFalta,
  preenchimento,
  type Briefing,
  type IdSeparador,
} from '@/lib/briefing';

const ICONES: Record<IdSeparador, typeof Target> = {
  nicho: Target,
  publico: Users,
  posicionamento: Compass,
  autoridade: Trophy,
};

/**
 * O briefing: quatro separadores, vinte campos.
 * É o que a Cát.IA lê antes de escrever — daí valer a pena estar completo.
 */
export default function PerfilPage() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<Briefing>({});
  /** primeira vez: entrou agora e ainda não respondeu ao essencial */
  const [primeiraVez, setPrimeiraVez] = useState(false);
  /** a admin a espreitar o primeiro dia — o briefing dela está feito */
  const [aEspreitar, setAEspreitar] = useState(false);
  const [aba, setAba] = useState<IdSeparador>('nicho');
  const [busy, setBusy] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avaliacao, setAvaliacao] = useState<string | null>(null);
  const [aAvaliar, setAAvaliar] = useState(false);
  const [aImportar, setAImportar] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);
  const ficheiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/perfil')
      .then((r) => r.json())
      .then((d) => {
        const b = (d.briefing ?? {}) as Briefing;
        const espreita = document.cookie.includes('primeiro-dia=1');
        setAEspreitar(espreita);
        // a espreitadela mostra o ecrã em branco, como ele aparece a quem
        // chega agora — e não grava nada, para não estragar o dela
        setBriefing(espreita ? {} : b);
        setPrimeiraVez(espreita || emFalta(b).length > 0);
      });
  }, []);

  const { feitos, total } = preenchimento(briefing);
  const falta = emFalta(briefing);
  /** o briefing anda em quatro passos; o último é o que abre a app */
  const passo = SEPARADORES.findIndex((x) => x.id === aba);
  const ultimo = passo === SEPARADORES.length - 1;
  const separador = SEPARADORES.find((s) => s.id === aba)!;

  /**
   * Guarda o que lhe derem. Recebe os valores por argumento de propósito: as
   * escolhas guardam-se no mesmo instante em que se carrega no botão, e nessa
   * altura o estado do ecrã ainda é o anterior.
   */
  async function guardarCom(valores: Briefing) {
    if (aEspreitar) return; // a espreitadela não escreve na conta dela
    setBusy(true);
    setError(null);
    const d = await fetch('/api/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefing: valores }),
    }).then((r) => r.json());
    setBusy(false);
    if (d.error) return setError(d.error);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  }

  const guardar = () => guardarCom(briefing);

  /**
   * O botão de quem está a entrar pela primeira vez: só abre a app depois de
   * responder ao essencial, e diz o que falta em vez de se limitar a recusar.
   */
  /** Guardar o que está e passar ao pilar seguinte. */
  async function avancar() {
    await guardarCom(briefing);
    setAba(SEPARADORES[passo + 1].id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** sair da espreitadela ao primeiro dia */
  async function sairDaEspreitadela() {
    await fetch('/api/ver-como', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primeiroDia: false }),
    });
    router.push('/admin');
    router.refresh();
  }

  async function guardarEComecar() {
    if (aEspreitar) return sairDaEspreitadela();
    if (falta.length) {
      setAba(SEPARADORES.find((s) => s.campos.some((c) => c.id === falta[0].id))!.id);
      setError(
        `Falta responder: ${falta.map((c) => c.pergunta.replace(/\?$/, '')).join(' · ')}`,
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    await guardarCom(briefing);
    router.push('/criar');
  }

  async function avaliar() {
    setAAvaliar(true);
    setError(null);
    const d = await fetch('/api/perfil/avaliar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefing }),
    }).then((r) => r.json());
    setAAvaliar(false);
    if (d.error) return setError(d.error);
    setAvaliacao(d.avaliacao);
  }

  const set = (id: string, v: string) => setBriefing({ ...briefing, [id]: v });

  /**
   * Carregar o Documento Mestre e ficar com tudo preenchido.
   * Se o documento saiu daqui, as respostas voltam exatamente como estavam.
   */
  async function importar(f: File) {
    setAImportar(true);
    setError(null);
    setRecado(null);
    try {
      const corpo = new FormData();
      corpo.append('ficheiro', f);
      const d = await fetch('/api/perfil/importar', { method: 'POST', body: corpo }).then((r) =>
        r.json(),
      );
      if (d.error) throw new Error(d.error);

      const juntos = { ...briefing, ...(d.briefing as Briefing) };
      setBriefing(juntos);
      if (!aEspreitar) await guardarCom(juntos);
      setRecado(
        d.origem === 'documento'
          ? 'Documento reconhecido — o briefing ficou como estava lá dentro.'
          : 'Li o documento e arrumei as respostas pelas perguntas. Dá-lhes uma vista de olhos.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui ler o ficheiro.');
    } finally {
      setAImportar(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Sobre mim"
        subtitle="O teu briefing. É isto que a Cát.IA lê antes de escrever seja o que for — quanto mais concreto, menos genérico sai o conteúdo."
        action={
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              {feitos} de {total} campos
            </span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-rosa transition-all"
                style={{ width: `${(feitos / total) * 100}%` }}
              />
            </div>
          </div>
        }
      />

      <Wizard destaque="perfil" />

      {aEspreitar && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-ink/20 bg-creme px-5 py-3">
          <Eye className="h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1 text-sm">
            Estás a ver o <strong>primeiro dia</strong> de quem acabou de se registar — ecrã em
            branco, menu fechado. Nada do que escreveres aqui é guardado, e o teu briefing está
            intacto.
          </p>
          <button className="btn-ghost shrink-0 px-3 py-1.5 text-xs" onClick={sairDaEspreitadela}>
            Sair
          </button>
        </div>
      )}

      {primeiraVez && (
        <Card className="mb-4">
          <h2 className="mb-1 font-medium">Já tens isto escrito?</h2>
          <p className="mb-3 text-sm leading-relaxed text-muted">
            Se já tiveste esta app antes, ou se tens um documento onde te apresentas, carrega-o
            aqui e eu preencho o briefing por ti. Aceito o <strong>Documento Mestre</strong> desta
            app (preenche tudo de uma vez, exatamente como estava) ou um PDF, Word ou texto teu.
          </p>
          <input
            ref={ficheiro}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importar(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn-ghost w-full"
            onClick={() => ficheiro.current?.click()}
            disabled={aImportar}
          >
            {aImportar ? (
              <Spinner label="A ler o documento…" />
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Carregar documento
              </>
            )}
          </button>
        </Card>
      )}

      {recado && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-sand bg-creme/70 px-4 py-3 text-sm">
          <span className="flex-1">{recado}</span>
          <button className="text-muted hover:text-ink" onClick={() => setRecado(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {primeiraVez && (
        <div className="mb-5 rounded-2xl border border-rosa/30 bg-rosaSuave/40 px-5 py-4">
          <h2 className="mb-1 font-semibold">Antes de começarmos</h2>
          <p className="text-sm leading-relaxed text-ink/80">
            A Cát.IA escreve a partir daqui. Sem saber o teu nicho e para quem falas, sairia
            conteúdo que serve a toda a gente — que é o mesmo que não servir ninguém. Responde às{' '}
            <strong>{OBRIGATORIOS.length} perguntas marcadas</strong> e a app abre-se; o resto
            podes ir preenchendo depois.
          </p>
          {falta.length > 0 && (
            <p className="mt-2 text-sm text-ink/70">
              Faltam {falta.length} de {OBRIGATORIOS.length}.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* ── separadores ─────────────────────────────── */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-sand bg-creme/70 p-1">
        {SEPARADORES.map((s) => {
          const Icone = ICONES[s.id];
          const porResponder = s.campos.filter((c) => !(briefing[c.id] ?? '').trim()).length;
          return (
            <button
              key={s.id}
              onClick={() => setAba(s.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                aba === s.id ? 'bg-superficie font-medium text-ink shadow-soft' : 'text-muted hover:text-ink'
              }`}
            >
              <Icone className="h-4 w-4" />
              {s.titulo}
              {porResponder > 0 && (
                <span className="rounded-full bg-rosa/15 px-1.5 text-[10px] text-rosa">
                  {porResponder}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── etiqueta da secção ──────────────────────── */}
      <div className={`mb-4 rounded-2xl border px-5 py-3.5 ${separador.fundo}`}>
        <p className={`text-sm font-semibold uppercase tracking-wide ${separador.cor}`}>
          {separador.titulo}
        </p>
      </div>

      {/* ── campos ──────────────────────────────────── */}
      <div className="space-y-4 pb-4">
        {separador.campos.map((campo) => {
          const semResposta = briefing[campo.id] === '__nenhum__';
          return (
            <Card key={campo.id}>
              <label className="mb-3 block font-medium">
                {campo.pergunta}
                {OBRIGATORIOS.includes(campo.id) && (
                  <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-wide text-rosa">
                    essencial
                  </span>
                )}
              </label>

              {campo.tipo === 'escolha' ? (
                <div className="flex gap-3">
                  {campo.opcoes?.map((o) => (
                    <button
                      key={o}
                      onClick={() => {
                        const novo = { ...briefing, [campo.id]: o };
                        setBriefing(novo);
                        guardarCom(novo);
                      }}
                      className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm transition ${
                        briefing[campo.id] === o
                          ? 'border-ink bg-creme font-medium'
                          : 'border-sand hover:border-rosa/40'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              ) : campo.tipo === 'texto' ? (
                <input
                  className="input"
                  value={briefing[campo.id] ?? ''}
                  onChange={(e) => set(campo.id, e.target.value)}
                  onBlur={guardar}
                  placeholder={campo.ajuda}
                />
              ) : (
                <textarea
                  className="input min-h-[130px] leading-relaxed"
                  value={semResposta ? '' : briefing[campo.id] ?? ''}
                  onChange={(e) => set(campo.id, e.target.value)}
                  onBlur={guardar}
                  placeholder={campo.ajuda}
                  disabled={semResposta}
                />
              )}

              {campo.semResposta && (
                <label className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={semResposta}
                    onChange={(e) => {
                      const novo = {
                        ...briefing,
                        [campo.id]: e.target.checked ? '__nenhum__' : '',
                      };
                      setBriefing(novo);
                      guardarCom(novo);
                    }}
                  />
                  {campo.semResposta}
                </label>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── a avaliação da Cát.IA ───────────────────── */}
      {avaliacao && (
        <Card className="mb-4 border-rosa/40">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rosa" />
            <h2 className="font-medium">O que a Cát.IA diz do teu briefing</h2>
            <button
              onClick={() => setAvaliacao(null)}
              className="ml-auto rounded-full p-1 text-muted transition hover:bg-creme hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <TextoRico texto={avaliacao} />
        </Card>
      )}

      {/* ── barra de ações ──────────────────────────── */}
      <div className="sticky bottom-0 -mx-8 mt-2 flex flex-wrap items-center gap-3 border-t border-sand bg-paper/90 px-8 py-4 backdrop-blur">
        <button className="btn-ghost" onClick={avaliar} disabled={aAvaliar || busy}>
          {aAvaliar ? <Spinner label="A ler o teu briefing…" /> : (<><Target className="h-4 w-4" /> Avaliar briefing</>)}
        </button>

        {/* o documento é o fim da linha: só faz sentido no último pilar */}
        {ultimo && (
          <a
            href="/api/perfil/documento"
            className="btn-ghost"
            title="O teu briefing em PDF, com as cores e as letras da app"
          >
            <Download className="h-4 w-4" />
            Baixar Documento Mestre
          </a>
        )}

        <span className="text-xs text-muted">
          {guardado ? 'guardado' : 'guarda-se sozinho ao sair de cada campo'}
        </span>

        {!ultimo ? (
          <button className="btn-primary ml-auto" onClick={avancar} disabled={busy}>
            {busy ? 'A guardar…' : 'Avançar'}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : primeiraVez ? (
          <button className="btn-primary ml-auto" onClick={guardarEComecar} disabled={busy}>
            <Save className="h-4 w-4" />{' '}
            {busy ? 'A guardar…' : aEspreitar ? 'Sair da espreitadela' : 'Guardar e começar'}
          </button>
        ) : (
          <button className="btn-escuro ml-auto" onClick={guardar} disabled={busy}>
            <Save className="h-4 w-4" /> {busy ? 'A guardar…' : 'Guardar'}
          </button>
        )}
      </div>
    </>
  );
}
