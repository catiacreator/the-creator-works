'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  Moon,
  Palette,
  Save,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';

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

type Painel = 'voz' | 'conta' | 'aspeto';

export default function DefinicoesClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [escuro, setEscuro] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [recadoEmail, setRecadoEmail] = useState<string | null>(null);
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  /** mudar o email da conta é coisa de admin — a lista de acessos depende dele */
  const [souAdmin, setSouAdmin] = useState(false);

  async function load() {
    const data = await fetch('/api/settings').then((r) => r.json());
    setSettings(data.settings);
  }

  useEffect(() => {
    load();
    setEscuro(document.documentElement.classList.contains('dark'));
    fetch('/api/eu')
      .then((r) => r.json())
      .then((d) => {
        setEmail(d.email ?? null);
        setSouAdmin(d.papel === 'admin');
      })
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

  /**
   * Mudar o email da conta.
   *
   * O Supabase manda um link de confirmação para o endereço novo — só depois
   * de o abrir é que a troca acontece. E há uma travagem antes disso: se o
   * email novo não estiver na lista de quem pode entrar, a troca deixava-a
   * fechada de fora na página seguinte. Mais vale recusar aqui.
   */
  async function mudarEmail() {
    const alvo = novoEmail.trim().toLowerCase();
    setErroEmail(null);
    setRecadoEmail(null);

    if (!alvo || !alvo.includes('@')) return setErroEmail('Escreve o email novo.');
    if (alvo === (email ?? '').toLowerCase()) return setErroEmail('Esse já é o teu email.');
    // trocar para um email que não está na lista de pessoas era a maneira mais
    // fácil de ficar fechada de fora — o servidor confirma antes de enviar
    const check = await fetch(`/api/membros/existe?email=${encodeURIComponent(alvo)}`).then((r) =>
      r.json(),
    );
    if (!check.existe) {
      return setErroEmail(
        'Este email ainda não tem acesso à app — se trocasses agora, ficavas fechada de fora. ' +
          'Convida-o primeiro no Admin, com o papel de admin.',
      );
    }

    setBusy(true);
    const { createClient } = await import('@/lib/supabase/client');
    const { error } = await createClient().auth.updateUser(
      { email: alvo },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/definicoes` },
    );
    setBusy(false);
    if (error) return setErroEmail(error.message);
    setRecadoEmail(alvo);
    setNovoEmail('');
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
        <PageHeader title="A tua conta" subtitle="Com que email entras, e como." />
        <Card className="mb-4">
          <p className="label">E-mail</p>
          <p className="text-[15px]">{email ?? '—'}</p>
          <p className="mt-2 text-xs text-muted">
            É por este email que entras. A app é privada: mais ninguém tem acesso.
          </p>
        </Card>

        {!souAdmin ? (
          <Card className="mb-4">
            <h2 className="mb-1 font-medium">Mudar de email</h2>
            <p className="text-sm leading-relaxed text-muted">
              O email é a chave que te dá acesso a esta app, e quem gere essas chaves é a admin.
              Se precisares de mudar o teu, fala com ela.
            </p>
          </Card>
        ) : (
        <Card className="mb-4">
          <h2 className="mb-1 font-medium">Mudar de email</h2>
          <p className="mb-3 text-sm text-muted">
            Enviamos um link para o endereço novo. A troca só acontece depois de o abrires — até
            lá, entras com o de sempre.
          </p>

          {recadoEmail ? (
            <div className="rounded-xl border border-sand bg-creme/60 px-4 py-3 text-sm">
              Link enviado para <strong>{recadoEmail}</strong>. Abre-o nesse email para confirmar a
              troca.
            </div>
          ) : (
            <>
              <input
                type="email"
                className="input mb-2"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="o.email.novo@exemplo.com"
              />
              {erroEmail && <p className="mb-2 text-sm text-rose-700">{erroEmail}</p>}
              <button className="btn-ghost w-full" onClick={mudarEmail} disabled={busy}>
                <Mail className="h-4 w-4" />
                {busy ? 'A enviar…' : 'Enviar link de confirmação'}
              </button>
            </>
          )}
        </Card>
        )}
        <Card>
          <h2 className="mb-1 font-medium">Palavra-passe</h2>
          <p className="mb-3 text-sm text-muted">
            Para entrares sem esperar pelo link do email.
          </p>
          <Link href="/palavra-passe" className="btn-ghost w-full">
            <KeyRound className="h-4 w-4" />
            Definir palavra-passe
          </Link>
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
          descricao="Email e palavra-passe"
          abre="conta"
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
          titulo="Memória da Cát.IA"
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
