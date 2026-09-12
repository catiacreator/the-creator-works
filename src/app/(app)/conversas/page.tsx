'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Info, MessagesSquare, Trash2 } from 'lucide-react';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { GUARDA_CONVERSAS } from '@/lib/conversas';

interface Conversa {
  id: string;
  title: string;
  created_at: string;
}

/**
 * O histórico de conversas com a Cát.IA.
 *
 * Guardam-se as dez mais recentes, e só essas. Quando se abre a décima
 * primeira, a mais antiga vai fora — e vai fora a sério, com as mensagens
 * atrás. Está escrito na página porque uma app que apaga coisas em silêncio
 * é uma app em que não se confia.
 *
 * O que interessa guardar a sério — a voz, o que resultou, o que a Cát.IA
 * aprendeu — não está aqui: está na Memória, que não se apaga.
 */
export default function ConversasPage() {
  const [conversas, setConversas] = useState<Conversa[] | null>(null);

  const carregar = useCallback(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => setConversas(d.threads ?? []))
      .catch(() => setConversas([]));
  }, []);

  useEffect(carregar, [carregar]);

  async function apagar(id: string) {
    setConversas((c) => (c ?? []).filter((x) => x.id !== id));
    await fetch(`/api/chat?thread=${id}`, { method: 'DELETE' });
    window.dispatchEvent(new Event('conversas-mudaram'));
  }

  function quando(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  return (
    <>
      <PageHeader
        title="Históricos de conversas"
        subtitle="Onde voltas ao que já falaste com a Cát.IA."
      />

      <Card className="mb-5">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />
          <p className="text-sm leading-relaxed text-muted">
            Guardam-se só as <strong className="text-ink">{GUARDA_CONVERSAS} conversas mais
            recentes</strong>. Quando abres uma nova e já tens {GUARDA_CONVERSAS}, a mais antiga é
            apagada — e é apagada mesmo, com as mensagens dela. Se houver alguma
            que queiras mesmo guardar, copia o que interessa antes.
            <br />
            <span className="mt-1 inline-block">
              O que a Cát.IA aprendeu contigo não se perde por aqui: isso vive
              na{' '}
              <Link href="/memoria" className="underline hover:text-ink">
                Memória
              </Link>
              , e a Memória não se apaga.
            </span>
          </p>
        </div>
      </Card>

      {conversas === null && <Spinner label="a ir buscar as conversas" />}

      {conversas?.length === 0 && (
        <Card>
          <p className="text-sm leading-relaxed text-muted">
            Ainda não falámos sobre nada.{' '}
            <Link href="/chat" className="underline hover:text-ink">
              Começa uma conversa
            </Link>
            .
          </p>
        </Card>
      )}

      {!!conversas?.length && (
        <div className="flex flex-col gap-2">
          {conversas.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-3 rounded-xl border border-sand bg-superficie px-4 py-3 transition hover:border-ink/40"
            >
              <MessagesSquare className="h-4 w-4 shrink-0 text-muted" />
              <Link href={`/chat?thread=${c.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.title}</span>
                <span className="block text-xs text-muted">{quando(c.created_at)}</span>
              </Link>
              <Link
                href={`/chat?thread=${c.id}`}
                className="hidden items-center gap-1 text-xs text-muted transition hover:text-ink sm:inline-flex"
              >
                abrir <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => apagar(c.id)}
                title="Apagar esta conversa"
                className="shrink-0 rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-rosaSuave hover:text-rosa group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
