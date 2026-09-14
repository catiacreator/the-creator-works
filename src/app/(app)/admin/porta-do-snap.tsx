'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, DoorOpen, ExternalLink, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';

interface Peca {
  id: string;
  nome: string;
  feito: boolean;
  falta?: string;
}

interface Estado {
  pecas: Peca[];
  entradas: number | null;
  desteLado: boolean;
  carouselSnap: string;
}

/**
 * O estado da porta do CarouselSnap.
 *
 * Existe por causa de uma pergunta que não tinha resposta: quando alguém
 * carrega no botão lá e acaba na página de entrada daqui, de que lado está o
 * problema? A ligação tem quatro peças e três delas não estão no código —
 * variáveis na Vercel, migrações no Supabase, e o botão do outro lado. Sem
 * uma lista, a única resposta possível era «não funciona».
 *
 * A última linha é a mais importante e a menos óbvia: se este lado estiver
 * todo pronto e mesmo assim nunca tiver entrado ninguém, a peça que falta é a
 * de lá. É a única maneira de ver, daqui, uma coisa que vive noutra app.
 */
export function PortaDoSnap() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/porta/estado')
      .then((r) => r.json())
      .then((d) => (d.error ? setErro(d.error) : setEstado(d)))
      .catch(() => setErro('Não deu para ver o estado da porta.'));
  }, []);

  const faltam = (estado?.pecas ?? []).filter((p) => !p.feito);

  return (
    <Card className="mb-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <DoorOpen className="h-4 w-4 text-muted" />
        <h2 className="font-medium">A entrada pelo CarouselSnap</h2>
        {estado && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              estado.desteLado ? 'bg-rosa text-white' : 'bg-manteiga text-ink'
            }`}
          >
            {estado.desteLado ? 'este lado pronto' : `faltam ${faltam.length}`}
          </span>
        )}
      </div>

      <p className="mb-3 text-sm leading-relaxed text-muted">
        Quem vem do CarouselSnap deve entrar direto, sem pedir nada. Isso só
        acontece se as peças abaixo estiverem todas postas — e a última delas
        é do outro lado.
      </p>

      {erro && (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {erro}
        </p>
      )}

      {!estado && !erro && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> A ver…
        </p>
      )}

      {estado && (
        <>
          <ul className="mb-4 space-y-2">
            {estado.pecas.map((p) => (
              <li key={p.id} className="flex gap-2.5 text-sm">
                {p.feito ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />
                )}
                <span className="min-w-0">
                  <span className={p.feito ? 'text-muted line-through' : 'font-medium'}>
                    {p.nome}
                  </span>
                  {!p.feito && p.falta && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      {p.falta}
                    </span>
                  )}
                </span>
              </li>
            ))}

            {/* a peça que vive na outra app */}
            <li className="flex gap-2.5 text-sm">
              {estado.entradas && estado.entradas > 0 ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />
              )}
              <span className="min-w-0">
                <span
                  className={
                    estado.entradas && estado.entradas > 0 ? 'text-muted line-through' : 'font-medium'
                  }
                >
                  O botão do lado do CarouselSnap
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {estado.entradas === null
                    ? 'Não dá para contar sem as peças de cima.'
                    : estado.entradas > 0
                      ? `${estado.entradas} ${estado.entradas === 1 ? 'entrada' : 'entradas'} por aqui — está a funcionar.`
                      : 'Nunca entrou ninguém por aqui. O botão lá tem de abrir thecreatorworks.com/entrar?t=BILHETE, com um bilhete feito por uma edge function. Se abrir só thecreatorworks.com, a pessoa cai na página de entrada — é o que está a acontecer.'}
                </span>
              </span>
            </li>
          </ul>

          <a href="/api/porta/testar" className="btn-fantasma">
            <ExternalLink className="h-4 w-4" />
            Experimentar a porta
          </a>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Escreve um bilhete a valer para a tua conta e atira-te para a porta com ele. Se
            entrares, este lado está pronto e o que falta é o botão de lá. Se caíres na página de
            assinatura, o problema é cá.
          </p>
        </>
      )}
    </Card>
  );
}
