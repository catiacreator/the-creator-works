'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, X, Sparkles, PenTool, Wand2, UserRound } from 'lucide-react';

/**
 * A ajuda, no fundo da barra lateral.
 *
 * Já esteve a flutuar no canto do ecrã e tapava o último botão de cada página
 * — que é normalmente o mais importante. Aqui não tapa nada, e está no sítio
 * onde se procura ajuda.
 *
 * Não abre um chat de suporte: explica o percurso da app em quatro linhas, que
 * é o que costuma faltar a quem entra.
 */
export function Ajuda({ fechada }: { fechada?: boolean }) {
  const [aberto, setAberto] = useState(false);

  const passos = [
    {
      icone: UserRound,
      titulo: 'Sobre mim',
      texto: 'O documento mestre. A Cát.IA lê-o antes de escrever seja o que for.',
      href: '/perfil',
    },
    {
      icone: Wand2,
      titulo: 'Cát.IA',
      texto: 'Pede-lhe um carrossel. Ela escreve e tu abres o resultado no editor.',
      href: '/chat',
    },
    {
      icone: Sparkles,
      titulo: 'Criar carrossel',
      texto: 'Carrega um PDF e a app diz quantos carrosséis lá cabem.',
      href: '/criar',
    },
    {
      icone: PenTool,
      titulo: 'Editor',
      texto: 'Desenha o template uma vez. Depois tudo sai com a tua cara.',
      href: '/editor',
    },
  ];

  return (
    <>
      {aberto && (
        <div className="fixed bottom-20 left-4 z-50 w-80 rounded-[1.25rem] border border-sand bg-white p-5 shadow-lift">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Como isto funciona</h2>
            <button
              onClick={() => setAberto(false)}
              className="ml-auto rounded-full p-1 text-muted transition hover:bg-creme hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {passos.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                onClick={() => setAberto(false)}
                className="flex gap-3 rounded-xl p-2 transition hover:bg-creme"
              >
                <p.icone className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />
                <span>
                  <span className="block text-sm font-medium">{p.titulo}</span>
                  <span className="block text-xs leading-relaxed text-muted">{p.texto}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setAberto(!aberto)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted transition hover:bg-creme hover:text-ink ${
          fechada ? 'justify-center px-0' : 'w-full'
        }`}
        title="Como isto funciona"
      >
        {aberto ? <X className="h-3.5 w-3.5" /> : <HelpCircle className="h-3.5 w-3.5" />}
        {!fechada && 'Como isto funciona'}
      </button>
    </>
  );
}
