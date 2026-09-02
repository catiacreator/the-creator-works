'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Ajuda } from './ajuda';
import { BotaoDeTema } from './tema';
import {
  Sparkles,
  Library,
  UserRound,
  UserSearch,
  PenTool,
  Brain,
  Crown,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  MessageSquarePlus,
  Trash2,
  Clock,
  Radio,
  Flame,
} from 'lucide-react';

/**
 * A barra por categorias.
 * Um grupo sem título é um atalho solto; com título, é uma secção.
 */
const GRUPOS: Array<{
  titulo?: string;
  itens: Array<{ href: string; label: string; icone: typeof Sparkles }>;
}> = [
  {
    itens: [{ href: '/criar', label: 'Criar', icone: Sparkles }],
  },
  {
    titulo: '🔥 Carrosséis Creator',
    itens: [
      { href: '/criar-carrosseis', label: 'Criar carrosséis', icone: Flame },
      { href: '/editor', label: 'Editor', icone: PenTool },
    ],
  },
  {
    itens: [{ href: '/biblioteca', label: 'Biblioteca', icone: Library }],
  },
  {
    itens: [
      { href: '/chat', label: 'Agente Cát.IA', icone: Crown },
      { href: '/memoria', label: 'Memória da Cát.IA', icone: Brain },
      { href: '/ultima-hora', label: 'Última hora', icone: Radio },
      { href: '/analise', label: 'Análise de perfil', icone: UserSearch },
    ],
  },
  {
    titulo: 'Configurações',
    itens: [
      { href: '/perfil', label: 'Sobre mim', icone: UserRound },
      { href: '/definicoes', label: 'Definições', icone: Settings },
    ],
  },
];

interface Conversa {
  id: string;
  title: string;
  created_at: string;
}

export function Nav({
  email,
  bloqueado,
}: {
  email?: string | null;
  /** enquanto o Sobre mim não estiver respondido, só ele está aberto */
  bloqueado?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const [fechada, setFechada] = useState(false);

  const carregarConversas = useCallback(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => setConversas((d.threads ?? []).slice(0, 12)));
  }, []);

  useEffect(() => {
    setFechada(window.localStorage.getItem('barra-fechada') === 'sim');
    carregarConversas();
    setAberta(new URLSearchParams(window.location.search).get('thread'));
  }, [pathname, carregarConversas]);

  // o chat avisa quando abre ou apaga uma conversa — a lista aqui não pode
  // ficar a mostrar o que já não existe
  useEffect(() => {
    const aoMudar = () => {
      carregarConversas();
      setAberta(new URLSearchParams(window.location.search).get('thread'));
    };
    window.addEventListener('conversas-mudaram', aoMudar);
    return () => window.removeEventListener('conversas-mudaram', aoMudar);
  }, [carregarConversas]);

  async function apagarConversa(id: string) {
    await fetch(`/api/chat?thread=${id}`, { method: 'DELETE' });
    setConversas((c) => c.filter((x) => x.id !== id));
    if (aberta === id) router.push('/chat');
  }

  async function signOut() {
    const { createClient } = await import('@/lib/supabase/client');
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function alternar() {
    const novo = !fechada;
    setFechada(novo);
    window.localStorage.setItem('barra-fechada', novo ? 'sim' : 'nao');
  }

  return (
    <aside
      className={clsx(
        'flex shrink-0 flex-col border-r border-sand bg-superficie transition-all',
        fechada ? 'w-[68px]' : 'w-64',
      )}
    >
      {/* ── marca ──────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-5">
        <Link href="/" className="min-w-0 leading-none">
          {fechada ? (
            // fechada, só cabe a marca reduzida
            <span className="block text-[17px] font-semibold tracking-tight">
              T<span className="text-rosa">W</span>
            </span>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/the-creator-works.png"
                alt="The Creator Works"
                className="h-[26px] w-auto dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/the-creator-works-escuro.png"
                alt="The Creator Works"
                className="hidden h-[26px] w-auto dark:block"
              />
            </>
          )}
        </Link>
        <button
          onClick={alternar}
          className="ml-auto shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
          title={fechada ? 'Abrir a barra' : 'Fechar a barra'}
        >
          {fechada ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* ── secções ────────────────────────────────── */}
      <nav className="space-y-4 px-3">
        {GRUPOS.map((grupo, i) => (
          <div key={grupo.titulo ?? i} className="space-y-0.5">
            {grupo.titulo && !fechada && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {grupo.titulo}
              </p>
            )}
            {grupo.titulo && fechada && <div className="mx-3 mb-1 border-t border-sand" />}

            {grupo.itens.map((link) => {
              const ativo =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              // no primeiro dia só o Sobre mim está aberto
              const fechado = bloqueado && link.href !== '/perfil';
              return (
                <Link
                  key={link.href}
                  href={fechado ? '/perfil' : link.href}
                  title={
                    fechado
                      ? 'Responde ao Sobre mim para abrir'
                      : fechada
                        ? link.label
                        : undefined
                  }
                  aria-disabled={fechado || undefined}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                    fechado
                      ? 'cursor-not-allowed text-muted/50'
                      : ativo
                        ? 'bg-rosa font-medium text-white shadow-lift'
                        : 'text-ink/75 hover:bg-creme hover:text-ink',
                    fechada && 'justify-center px-0',
                  )}
                  onClick={(e) => {
                    if (fechado) e.preventDefault();
                  }}
                >
                  <link.icone
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={ativo ? 2.2 : 1.8}
                  />
                  {!fechada && link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── as conversas com a Cát.IA ──────────────── */}
      {!fechada && (
        <div className="mt-6 flex min-h-0 flex-1 flex-col border-t border-sand px-3 pt-4">
          <div className="mb-2 flex items-center gap-1.5 px-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <Clock className="h-3 w-3" /> Conversas
            </p>
            <Link
              href="/chat"
              title="Nova conversa"
              className="ml-auto rounded-lg p-1 text-muted transition hover:bg-creme hover:text-ink"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-4">
            {conversas.map((c) => (
              <div
                key={c.id}
                className={clsx(
                  'group flex items-start gap-1 rounded-lg pr-1 transition',
                  aberta === c.id ? 'bg-creme' : 'hover:bg-creme',
                )}
              >
                <Link
                  href={`/chat?thread=${c.id}`}
                  className="min-w-0 flex-1 px-2 py-1.5 text-xs text-ink/70 transition hover:text-ink"
                >
                  <span className="line-clamp-2 leading-snug">{c.title}</span>
                </Link>
                <button
                  onClick={() => apagarConversa(c.id)}
                  title="Apagar conversa"
                  className="mt-1 shrink-0 rounded-lg p-1 text-muted opacity-0 transition hover:bg-rosaSuave hover:text-rosa group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {conversas.length === 0 && (
              <p className="px-2 text-xs text-muted">Ainda não falámos sobre nada.</p>
            )}
          </div>
        </div>
      )}

      {/* ── ajuda e sair ───────────────────────────── */}
      <div className={clsx('space-y-0.5 border-t border-sand p-3', fechada && 'text-center')}>
        <BotaoDeTema fechada={fechada} />
        <Ajuda fechada={fechada} />
        <button
          onClick={signOut}
          className={clsx(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted transition hover:bg-creme hover:text-ink',
            fechada ? 'justify-center px-0' : 'w-full',
          )}
          title="Sair"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!fechada && 'Sair'}
        </button>
      </div>
    </aside>
  );
}
