'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { PenTool, Sparkles } from 'lucide-react';
import { PageHeader, Spinner } from '@/components/ui';

/** A Cát.IA marca os carrosséis com um bloco ```carrossel — a app lê-o e monta. */
interface CarrosselDoChat {
  titulo?: string;
  slides?: Array<{ titulo?: string; corpo?: string; kicker?: string; cta?: string }>;
  legenda?: string;
  hashtags?: string;
}

function extrairCarrossel(texto: string): { limpo: string; carrossel: CarrosselDoChat | null } {
  const bloco = texto.match(/```carrossel\s*([\s\S]*?)```/i);
  if (!bloco) return { limpo: texto, carrossel: null };
  const limpo = texto.replace(bloco[0], '').trim();
  try {
    return { limpo, carrossel: JSON.parse(bloco[1].trim()) as CarrosselDoChat };
  } catch {
    return { limpo, carrossel: null };
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  photo_url?: string | null;
}

export default function ChatPage() {
  const router = useRouter();
  const [aMontar, setAMontar] = useState<string | null>(null);


  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const params = useSearchParams();

  // /chat?thread=… — o ecrã Criar abre aqui a conversa que acabou de criar, e
  // a barra lateral salta de conversa em conversa sem sair da página. Tem de
  // ser o router a dizer o que mudou: ler o window.location só resultava à
  // primeira, e daí as conversas não abrirem ao segundo clique.
  useEffect(() => {
    setThreadId(params.get('thread'));
  }, [params]);

  useEffect(() => {
    if (!threadId) return setMessages([]);
    fetch(`/api/chat?thread=${threadId}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []));
  }, [threadId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  /** Cria o carrossel a partir do que ela escreveu e leva-te ao sítio certo. */
  async function montar(c: CarrosselDoChat, id: string, paraEditor: boolean) {
    setAMontar(id);
    setError(null);
    try {
      const d = await fetch('/api/carousels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: c.titulo,
          topic: c.titulo,
          caption: c.legenda,
          hashtags: c.hashtags,
          slides: (c.slides ?? []).map((s) => ({
            fields: {
              ...(s.kicker ? { kicker: s.kicker } : {}),
              ...(s.titulo ? { titulo: s.titulo } : {}),
              ...(s.corpo ? { corpo: s.corpo } : {}),
              ...(s.cta ? { cta: s.cta } : {}),
            },
          })),
        }),
      }).then((r) => r.json());
      if (d.error) throw new Error(d.error);

      const novo = d.carousel.id;
      if (paraEditor) return router.push(`/editor/${novo}`);

      // compõe antes de mostrar
      for (let volta = 0; volta < 15; volta++) {
        const fila = await fetch('/api/jobs/run?limit=2', { method: 'POST' }).then((r) => r.json());
        if ((fila.remaining ?? 0) === 0) break;
        await new Promise((r) => setTimeout(r, 800));
      }
      router.push(`/carrosseis/${novo}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não consegui montar o carrossel.');
      setAMontar(null);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setError(null);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: 'user', content: text }]);
    setBusy(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: threadId, message: text }),
    });
    const data = await res.json();
    setBusy(false);

    if (data.error) return setError(data.error);
    if (!threadId) {
      setThreadId(data.thread_id);
      window.history.replaceState(null, '', `/chat?thread=${data.thread_id}`);
      window.dispatchEvent(new Event('conversas-mudaram'));
    }
    setMessages((m) => [...m, data.message]);
  }

  return (
    <>
      <PageHeader
        title="Cát.IA"
        subtitle="A tua parceira de escrita. Conhece o teu documento mestre e o material que carregaste, e escreve pelo método — gancho na capa, uma ideia por slide, comando no fim."
      />

      <div>
        <div>
          <div className="mb-4 min-h-[380px] space-y-4 rounded-2xl border border-sand bg-superficie p-5">
            {messages.length === 0 && (
              <div className="space-y-2 text-sm text-muted">
                <p>Diz-me o que precisas. Por exemplo:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>“Faz-me um carrossel de 7 slides sobre publicar todos os dias.”</li>
                  <li>“Dá-me cinco ganchos para o tema dos reposts.”</li>
                  <li>“Pega no PDF da mentoria e tira dali três carrosséis.”</li>
                  <li>“Este texto está bom? O que cortavas?”</li>
                </ul>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                    m.role === 'user' ? 'bg-ink text-paper' : 'bg-creme'
                  }`}
                >
                  {m.role === 'assistant' ? extrairCarrossel(m.content).limpo : m.content}

                  {m.role === 'assistant' &&
                    (() => {
                      const { carrossel } = extrairCarrossel(m.content);
                      if (!carrossel?.slides?.length) return null;
                      const ocupado = aMontar === m.id;
                      return (
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-sand pt-3">
                          <span className="text-xs text-muted">
                            {carrossel.slides.length} slides prontos
                          </span>
                          <button
                            className="btn-primary ml-auto !py-1.5 text-xs"
                            onClick={() => montar(carrossel, m.id, true)}
                            disabled={!!aMontar}
                          >
                            <PenTool className="h-3.5 w-3.5" />
                            {ocupado ? 'A montar…' : 'Abrir no editor'}
                          </button>
                          <button
                            className="btn-ghost !py-1.5 text-xs"
                            onClick={() => montar(carrossel, m.id, false)}
                            disabled={!!aMontar}
                          >
                            <Sparkles className="h-3.5 w-3.5" /> Criar express
                          </button>
                        </div>
                      );
                    })()}
                  {m.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.photo_url}
                      alt=""
                      className="mt-3 w-56 rounded-xl border border-sand"
                    />
                  )}
                </div>
              </div>
            ))}
            {busy && <Spinner label="A pensar…" />}
            <div ref={bottom} />
          </div>

          {error && (
            <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <textarea
              className="input min-h-[52px] flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Escreve-me um carrossel sobre… · dá-me cinco ganchos para… · o que corto neste texto?"
            />
            <button className="btn-primary" onClick={send} disabled={busy}>
              Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
