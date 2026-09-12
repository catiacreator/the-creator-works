'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Moon,
  Coins,
  Palette,
  Save,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { DA_PARA, DE_GRACA, TABELA, TECTO_CREDITOS } from '@/lib/creditos';

/**
 * Definições.
 *
 * Uma lista de portas, como num telemóvel: cada linha é um assunto, e quem
 * entra numa vê só essa. As chaves e as ligações continuam a viver no
 * ambiente do servidor — não se mexe nelas por aqui.
 */
interface Settings {
  text_model: string;
  render_engine: 'local' | 'canva';
  brand_voice: string;
}

type Painel = 'voz' | 'conta' | 'creditos' | 'aspeto';

export default function DefinicoesClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [escuro, setEscuro] = useState(false);
  const [consumo, setConsumo] = useState<{
    disponivel: boolean;
    total?: number;
    tecto: number;
    semTecto: boolean;
  } | null>(null);

  async function load() {
    const data = await fetch('/api/settings').then((r) => r.json());
    setSettings(data.settings);
  }

  useEffect(() => {
    load();
    fetch('/api/consumo')
      .then((r) => r.json())
      .then((d) => (d.error ? undefined : setConsumo(d)))
      .catch(() => undefined);
    setEscuro(document.documentElement.classList.contains('dark'));
    fetch('/api/eu')
      .then((r) => r.json())
      .then((d) => setEmail(d.email ?? null))
      .catch(() => {});
  }, []);

  async function save() {
    if (!settings) return;
    setBusy(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  async function sair() {
    const { createClient } = await import('@/lib/supabase/client');
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function trocarTema(novo: boolean) {
    setEscuro(novo);
    document.documentElement.classList.toggle('dark', novo);
    try {
      window.localStorage.setItem('tema', novo ? 'escuro' : 'claro');
    } catch {
      /* sem espaço para guardar — fica só nesta visita */
    }
  }

  const erro = params.get('erro');

  /** Uma porta da lista. Navega para outra página ou abre um painel aqui. */
  function Porta({
    icone: Icone,
    titulo,
    descricao,
    href,
    abre,
  }: {
    icone: LucideIcon;
    titulo: string;
    descricao: string;
    href?: string;
    abre?: Painel;
  }) {
    const conteudo = (
      <>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-creme text-ink">
          <Icone className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block font-semibold leading-snug">{titulo}</span>
          <span className="block text-sm text-muted">{descricao}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </>
    );

    const classe =
      'flex w-full items-center gap-4 rounded-[1.25rem] border border-sand bg-superficie px-5 py-4 transition hover:border-ink/30 hover:shadow-soft';

    return href ? (
      <Link href={href} className={classe}>
        {conteudo}
      </Link>
    ) : (
      <button className={classe} onClick={() => setPainel(abre!)}>
        {conteudo}
      </button>
    );
  }

  /** O cabeçalho de dentro de uma porta. */
  const Voltar = () => (
    <button
      onClick={() => setPainel(null)}
      className="mb-4 flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
    >
      <ChevronLeft className="h-4 w-4" />
      Definições
    </button>
  );

  if (!settings) return null;

  // ── dentro de uma porta ─────────────────────────
  if (painel === 'voz') {
    return (
      <>
        <Voltar />
        <PageHeader title="Voz da marca" subtitle="Como queres que a app escreva por ti." />
        <Card>
          <label className="label">Escreve-o por palavras tuas</label>
          <textarea
            className="input min-h-[160px]"
            value={settings.brand_voice}
            onChange={(e) => setSettings({ ...settings, brand_voice: e.target.value })}
            placeholder="Português de Portugal, frases curtas, sem jargão, como quem explica a uma amiga…"
          />
          <p className="mt-2 text-xs text-muted">
            Isto entra em tudo o que a app escreve — os carrosséis, os roteiros e as respostas da
            Cát.IA. O resto de quem tu és vive em <strong>Sobre mim</strong>.
          </p>
        </Card>
        <button className="btn-primary mt-4 w-full" onClick={save} disabled={busy}>
          <Save className="h-4 w-4" />
          {saved ? 'Guardado' : busy ? 'A guardar…' : 'Guardar'}
        </button>
      </>
    );
  }

  if (painel === 'conta') {
    return (
      <>
        <Voltar />
        <PageHeader title="A tua conta" subtitle="Com que conta estás aqui dentro." />
        {/*
          Já não há aqui email para trocar nem palavra-passe para definir: a
          conta é a do CarouselSnap, e é lá que se muda. Deixar cá os botões
          era oferecer uma troca que não passa de cá para lá — e uma pessoa
          que trocasse o email aqui ficava com duas contas que não se
          reconhecem.
        */}
        <Card className="mb-4">
          <p className="label">E-mail</p>
          <p className="text-[15px]">{email ?? '—'}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            É a conta com que entraste pelo CarouselSnap. Para mudares de email
            ou de palavra-passe, é lá que se faz — esta app não tem conta
            própria.
          </p>
        </Card>


      </>
    );
  }

  if (painel === 'creditos') {
    const gastos = consumo?.total ?? 0;
    const restam = Math.max(0, TECTO_CREDITOS - gastos);

    return (
      <>
        <Voltar />
        <PageHeader
          title="Créditos"
          subtitle="O que gasta, quanto gasta, e o que não gasta nada."
        />

        {/*
          Primeiro o número, depois o que ele dá.
          Uma barra de progresso sozinha não responde à única pergunta que se
          faz ao ver um número destes — "isto dá para quê?" — e por isso vem
          logo a seguir a conta feita.
        */}
        <Card className="mb-4">
          {consumo?.semTecto ? (
            <>
              <p className="label">Gastos este mês</p>
              <p className="text-[15px]">
                {gastos} <span className="text-muted">— sem tecto, és admin</span>
              </p>
            </>
          ) : (
            <>
              <p className="label">Este mês</p>
              <p className="text-2xl font-semibold">
                {restam} <span className="text-[15px] font-normal text-muted">créditos por gastar</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {gastos} de {TECTO_CREDITOS} gastos · volta a {TECTO_CREDITOS} no dia 1
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-creme">
                <div
                  className="h-full rounded-full bg-rosa transition-all"
                  style={{ width: `${Math.min(100, (gastos / TECTO_CREDITOS) * 100)}%` }}
                />
              </div>
            </>
          )}
        </Card>

        <Card className="mb-4">
          <p className="label">Os {TECTO_CREDITOS} créditos de um mês dão para</p>
          <ul className="mt-1 space-y-1.5 text-sm">
            {DA_PARA.map((d) => (
              <li key={d.o_que} className="flex gap-2">
                <span className="w-10 shrink-0 text-right font-semibold">{d.quantos}</span>
                <span className="text-muted">{d.o_que}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Um de cada vez, claro — na prática misturas. Serve para dar a
            escala: um carrossel por dia útil gasta pouco mais de metade do mês.
          </p>
        </Card>

        <Card className="mb-4">
          <p className="label">Quanto custa cada coisa</p>
          <div className="mt-1 divide-y divide-sand">
            {TABELA.map((l) => (
              <div key={l.acao} className="flex gap-3 py-3 first:pt-1 last:pb-1">
                <span className="mt-0.5 w-10 shrink-0 text-right text-[15px] font-semibold">
                  {l.custo}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{l.nome}</p>
                  <p className="text-xs text-muted">{l.onde}</p>
                  {l.nota && (
                    <p className="mt-1 text-xs leading-relaxed text-muted">{l.nota}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="label">Não gasta crédito nenhum</p>
          <ul className="mt-1 space-y-1 text-sm leading-relaxed text-muted">
            {DE_GRACA.map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            A regra é simples: gasta o que passa pela IA. O que é só teu —
            desenhar, guardar, exportar, reler — não gasta nada, por mais que o
            faças.
          </p>
        </Card>
      </>
    );
  }

  if (painel === 'aspeto') {
    return (
      <>
        <Voltar />
        <PageHeader title="Aspeto" subtitle="Claro de dia, escuro de noite — como preferires." />
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: false, nome: 'Claro', icone: Sun },
            { id: true, nome: 'Escuro', icone: Moon },
          ].map((t) => (
            <button
              key={t.nome}
              onClick={() => trocarTema(t.id)}
              className={`flex items-center gap-3 rounded-[1.25rem] border bg-superficie px-5 py-4 text-left transition ${
                escuro === t.id ? 'border-ink shadow-soft' : 'border-sand hover:border-ink/30'
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-creme">
                <t.icone className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <span className="font-semibold">{t.nome}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  // ── a lista ─────────────────────────────────────
  return (
    <>
      <PageHeader title="Definições" subtitle="A tua conta e a maneira como a app trabalha." />

      {erro && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {decodeURIComponent(erro)}
        </div>
      )}

      <div className="space-y-3">
        <Porta
          icone={UserRound}
          titulo="A tua conta"
          descricao="Com que conta entras, e os pedidos deste mês"
          abre="conta"
        />
        <Porta
          icone={Coins}
          titulo="Créditos"
          descricao={`O que gasta e quanto — ${TECTO_CREDITOS} por mês`}
          abre="creditos"
        />
        <Porta
          icone={FileText}
          titulo="Sobre mim"
          descricao="Nicho, público, posicionamento, autoridade"
          href="/perfil"
        />
        <Porta
          icone={Palette}
          titulo="Voz da marca"
          descricao="Como queres que a app escreva por ti"
          abre="voz"
        />
        <Porta
          icone={Brain}
          titulo="Memória do teu agente"
          descricao="Regras, campanhas e histórias"
          href="/memoria"
        />
        <Porta
          icone={escuro ? Moon : Sun}
          titulo="Aspeto"
          descricao="Modo claro ou escuro"
          abre="aspeto"
        />
      </div>

      <button
        onClick={sair}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-rosa/40 px-5 py-4 font-medium text-rosa transition hover:bg-rosaSuave/40"
      >
        <LogOut className="h-4 w-4" />
        Sair da conta
      </button>
    </>
  );
}
