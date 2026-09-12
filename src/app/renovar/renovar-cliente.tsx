'use client';

import { useEffect, useState } from 'react';
import { CalendarX2, ExternalLink, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * A porta que se fecha quando a subscrição do CarouselSnap deixa de valer.
 *
 * Não é a página de quem não tem lugar — é a de quem tinha. Por isso não a
 * põe na rua: a sessão fica de pé, o trabalho dela continua todo lá dentro, e
 * o que se mostra é o caminho de volta.
 *
 * E o caminho de volta é simples de mais para ter botões a explicá-lo: quem
 * tem a subscrição em dia volta ao CarouselSnap, abre o Creator Works a
 * partir de lá, e a passagem empurra o prazo sozinha. Não há nada a pagar
 * aqui nem ninguém a avisar.
 */
export function RenovarCliente({ snap }: { snap: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [aVer, setAVer] = useState(false);
  const [semNovidade, setSemNovidade] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => undefined);
  }, []);

  async function jaEstaEmDia() {
    setAVer(true);
    setSemNovidade(false);
    // o middleware devolve 402 a quem está em atraso; qualquer outra coisa
    // quer dizer que o prazo já foi empurrado e a app está aberta
    const r = await fetch('/api/consumo').catch(() => null);
    if (r && r.status !== 402) {
      window.location.href = '/';
      return;
    }
    setAVer(false);
    setSemNovidade(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="card">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rosaSuave">
          <CalendarX2 className="h-5 w-5 text-rosa" />
        </span>

        <h1 className="mb-2 text-2xl font-semibold">O teu acesso precisa de ser renovado</h1>
        <p className="mb-1 text-sm leading-relaxed text-muted">
          Nada do que fizeste se perdeu — os teus estilos, as tuas fotografias e
          a tua memória continuam onde estavam.
        </p>
        {email && <p className="mb-6 break-all text-xs text-muted">Conta: {email}</p>}

        <div className="mb-4 rounded-xl bg-creme px-4 py-3 text-sm leading-relaxed text-muted">
          O acesso a esta app vem da tua subscrição no CarouselSnap. Volta lá e
          abre o Creator Works a partir de lá — se a subscrição estiver em dia,
          entras de imediato e este aviso desaparece.
        </div>

        <a href={snap} className="btn-primario mb-4 w-full justify-center" rel="noopener noreferrer">
          Abrir o CarouselSnap
          <ExternalLink className="h-4 w-4" />
        </a>

        <button onClick={jaEstaEmDia} disabled={aVer} className="btn-fantasma w-full justify-center">
          <RefreshCw className={`h-4 w-4 ${aVer ? 'animate-spin' : ''}`} />
          {aVer ? 'A ver…' : 'Já renovei, deixa-me entrar'}
        </button>
        {semNovidade && (
          <p className="mt-3 text-center text-xs leading-relaxed text-muted">
            Ainda estás em atraso do lado de cá. O acesso volta assim que
            entrares uma vez pelo CarouselSnap — o botão de cima leva-te lá.
          </p>
        )}
      </div>

      <a href="/login" className="mt-6 text-center text-xs text-muted underline">
        Sair desta conta
      </a>
    </main>
  );
}
