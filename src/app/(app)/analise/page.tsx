'use client';

import { useEffect, useState } from 'react';
import {
  AtSign,
  UserSearch,
  Trash2,
  Clock,
  Download,
  ChevronUp,
  UserRound,
} from 'lucide-react';
import { Dialogo, Spinner } from '@/components/ui';
import { GuiaDaPagina } from '@/components/guia';
import { TextoRico } from '@/components/texto-rico';

interface Analise {
  id: string;
  handle: string;
  dados: Record<string, string>;
  analise: string;
  created_at: string;
}

/**
 * Análise de perfil.
 * Dás o que está no perfil e a Cát.IA devolve o relatório em seis blocos,
 * sempre os mesmos — para dar para comparar quando voltares daqui a um mês.
 */
export default function AnalisePage() {
  const [dados, setDados] = useState({
    handle: '',
    nome: '',
    bio: '',
    destaques: '',
    link: '',
    seguidores: '',
    notas: '',
  });
  const [semDestaques, setSemDestaques] = useState(false);
  const [aberta, setAberta] = useState<Analise | null>(null);
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [formAberto, setFormAberto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aApagar, setAApagar] = useState<Analise | null>(null);

  useEffect(() => {
    (async () => {
      const [a, p] = await Promise.all([
        fetch('/api/analise').then((r) => r.json()),
        fetch('/api/perfil').then((r) => r.json()),
      ]);

      setAnalises(a.analises ?? []);
      if (a.analises?.[0]) {
        setAberta(a.analises[0]);
        setFormAberto(false);
      }

      // o que já disseste em Sobre mim entra aqui sozinho
      const b = p.briefing ?? {};
      const ultima = a.analises?.[0]?.dados ?? {};
      setDados((d) => ({
        ...d,
        handle: (ultima.handle || b.instagram || '').replace(/^@/, ''),
        nome: ultima.nome || (b.nicho ? `${b.nicho}` : ''),
        bio: ultima.bio || '',
        destaques: ultima.destaques || '',
        link: ultima.link || '',
        seguidores: ultima.seguidores || '',
      }));
    })();
  }, []);

  async function analisar() {
    if (!dados.handle.trim()) return;
    setBusy(true);
    setError(null);
    const d = await fetch('/api/analise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...dados, destaques: semDestaques ? '' : dados.destaques }),
    }).then((r) => r.json());
    setBusy(false);
    if (d.error) return setError(d.error);
    setAnalises((a) => [d.analise, ...a]);
    setAberta(d.analise);
    setFormAberto(false);
  }

  async function apagar(a: Analise) {
    await fetch(`/api/analise/${a.id}`, { method: 'DELETE' });
    setAnalises((xs) => xs.filter((x) => x.id !== a.id));
    if (aberta?.id === a.id) setAberta(null);
    setAApagar(null);
  }

  const campo = (k: keyof typeof dados, v: string) => setDados({ ...dados, [k]: v });

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <GuiaDaPagina />
      {/* ── herói ───────────────────────────────────── */}
      <div className="pb-2 pt-6 text-center">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-sand bg-superficie shadow-soft">
          <AtSign className="h-7 w-7" strokeWidth={1.8} />
        </span>
        <h1 className="text-[38px] font-semibold leading-tight tracking-tight">
          Análise de Perfil
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-muted">
          Cola o que está no teu perfil. A Cát.IA cruza-o com o que disseste em{' '}
          <a href="/perfil" className="underline decoration-rosa/40 underline-offset-2 hover:text-ink">
            Sobre mim
          </a>{' '}
          e devolve o diagnóstico.
        </p>

        <div className="my-10 flex items-center gap-4">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-sand" />
          <span className="h-1.5 w-1.5 rounded-full bg-rosa" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-sand" />
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* ── o formulário ────────────────────────────── */}
      <div className="rounded-[1.5rem] border border-sand bg-superficie shadow-soft">
        <button
          onClick={() => setFormAberto(!formAberto)}
          className="flex w-full items-start gap-3 px-8 pb-5 pt-7 text-left"
        >
          <UserRound className="mt-1 h-6 w-6 shrink-0" strokeWidth={1.8} />
          <span className="min-w-0">
            <span className="block text-2xl font-semibold tracking-tight">O meu perfil</span>
            <span className="mt-1 block text-sm text-muted">
              Guarda o que está no perfil para reutilizares na próxima análise
            </span>
          </span>
          <ChevronUp
            className={`ml-auto mt-2 h-5 w-5 shrink-0 text-muted transition-transform ${
              formAberto ? '' : 'rotate-180'
            }`}
          />
        </button>

        {formAberto && (
          <div className="space-y-6 px-8 pb-8">
            <Campo etiqueta="@ do perfil">
              <div className="flex items-center rounded-2xl border border-sand bg-superficie px-4 transition focus-within:border-rosa focus-within:ring-4 focus-within:ring-rosa/15">
                <span className="text-muted">@</span>
                <input
                  className="w-full bg-transparent px-2 py-3.5 text-[15px] outline-none placeholder:text-muted/60"
                  value={dados.handle}
                  onChange={(e) => campo('handle', e.target.value.replace(/^@/, ''))}
                  placeholder="nomedeutilizador"
                  disabled={busy}
                />
              </div>
            </Campo>

            <Campo etiqueta="Nome estratégico">
              <Entrada
                valor={dados.nome}
                set={(v) => campo('nome', v)}
                dica="Ex.: Cátia Creator | Marketing com IA"
                ocupado={busy}
              />
            </Campo>

            <Campo etiqueta="Biografia">
              <Area
                valor={dados.bio}
                set={(v) => campo('bio', v)}
                dica="Cola aqui a bio completa do teu perfil…"
                ocupado={busy}
                alta
              />
            </Campo>

            <Campo etiqueta="Nomes dos destaques">
              <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-[15px] text-muted">
                <input
                  type="radio"
                  checked={semDestaques}
                  onChange={() => setSemDestaques(!semDestaques)}
                  className="h-4 w-4"
                />
                Não tenho destaques
              </label>
              {!semDestaques && (
                <Area
                  valor={dados.destaques}
                  set={(v) => campo('destaques', v)}
                  dica="Lista os nomes dos destaques, um por linha"
                  ocupado={busy}
                />
              )}
            </Campo>

            <div className="grid gap-6 sm:grid-cols-2">
              <Campo etiqueta="Link da bio">
                <Entrada
                  valor={dados.link}
                  set={(v) => campo('link', v)}
                  dica="o que está do outro lado"
                  ocupado={busy}
                />
              </Campo>
              <Campo etiqueta="Seguidores">
                <Entrada
                  valor={dados.seguidores}
                  set={(v) => campo('seguidores', v)}
                  dica="ex.: 4 200"
                  ocupado={busy}
                />
              </Campo>
            </div>

            <Campo etiqueta="Notas">
              <Area
                valor={dados.notas}
                set={(v) => campo('notas', v)}
                dica="O que quiseres que ela tenha em conta."
                ocupado={busy}
              />
            </Campo>

            <button
              className="btn-escuro w-full py-4 text-base"
              onClick={analisar}
              disabled={busy || !dados.handle.trim()}
            >
              {busy ? (
                <Spinner label="A ler o teu perfil…" />
              ) : (
                <>
                  <UserSearch className="h-4 w-4" /> Analisar perfil
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── o relatório ─────────────────────────────── */}
      {aberta && (
        <div className="mt-6 rounded-[1.5rem] border border-sand bg-superficie p-8 shadow-soft">
          <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-sand pb-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">@{aberta.handle}</h2>
              <p className="text-xs text-muted">
                {new Date(aberta.created_at).toLocaleDateString('pt-PT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <a
              className="btn-ghost ml-auto"
              download={`analise-${aberta.handle}.txt`}
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(aberta.analise)}`}
            >
              <Download className="h-4 w-4" /> Guardar
            </a>
          </div>
          <TextoRico texto={aberta.analise} />
        </div>
      )}

      {/* ── anteriores ──────────────────────────────── */}
      {analises.length > 1 && (
        <div className="mt-8">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <Clock className="h-3 w-3" /> Análises anteriores
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {analises.map((a) => (
              <div
                key={a.id}
                className={`group flex items-center gap-2 rounded-2xl border px-4 py-3 transition ${
                  aberta?.id === a.id ? 'border-rosa bg-rosaSuave/30' : 'border-sand bg-superficie'
                }`}
              >
                <button onClick={() => setAberta(a)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-medium">@{a.handle}</span>
                  <span className="block text-xs text-muted">
                    {new Date(a.created_at).toLocaleDateString('pt-PT')}
                  </span>
                </button>
                <button
                  onClick={() => setAApagar(a)}
                  className="shrink-0 rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-rosaSuave hover:text-rosa group-hover:opacity-100"
                  title="Apagar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {aApagar && (
        <Dialogo
          titulo="Apagar esta análise?"
          texto={`A análise de @${aApagar.handle} desaparece. Podes voltar a fazê-la a qualquer momento.`}
          confirmar="Apagar"
          perigo
          aoConfirmar={() => apagar(aApagar)}
          aoFechar={() => setAApagar(null)}
        />
      )}
    </div>
  );
}

/* ── peças do formulário, no registo da referência ────── */

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[15px] font-medium">{etiqueta}</p>
      {children}
    </div>
  );
}

function Entrada({
  valor,
  set,
  dica,
  ocupado,
}: {
  valor: string;
  set: (v: string) => void;
  dica?: string;
  ocupado?: boolean;
}) {
  return (
    <input
      className="w-full rounded-2xl border border-sand bg-superficie px-4 py-3.5 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-rosa focus:ring-4 focus:ring-rosa/15"
      value={valor}
      onChange={(e) => set(e.target.value)}
      placeholder={dica}
      disabled={ocupado}
    />
  );
}

function Area({
  valor,
  set,
  dica,
  ocupado,
  alta,
}: {
  valor: string;
  set: (v: string) => void;
  dica?: string;
  ocupado?: boolean;
  alta?: boolean;
}) {
  return (
    <textarea
      className={`w-full rounded-2xl border border-sand bg-superficie px-4 py-3.5 text-[15px] leading-relaxed outline-none transition placeholder:text-muted/60 focus:border-rosa focus:ring-4 focus:ring-rosa/15 ${
        alta ? 'min-h-[170px]' : 'min-h-[110px]'
      }`}
      value={valor}
      onChange={(e) => set(e.target.value)}
      placeholder={dica}
      disabled={ocupado}
    />
  );
}
