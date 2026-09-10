'use client';

import { useEffect, useState } from 'react';
import { CalendarX2, ExternalLink, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Preco } from '@/lib/assinatura';

/**
 * A porta que se fecha quando a mensalidade não é paga.
 *
 * Não é a página de quem não tem lugar — é a de quem tinha e deixou de
 * pagar. Por isso não a põe na rua: a sessão fica de pé, o trabalho dela
 * continua todo lá dentro, e o que se mostra é o caminho de volta.
 *
 * Assim que o Stripe avisar que a cobrança passou, o prazo é empurrado para
 * a frente e o acesso volta sozinho. Não é preciso ninguém fazer nada aqui —
 * só voltar a bater à porta, que é o que o botão faz.
 */
export function RenovarCliente({ precos }: { precos: Preco[] }) {
  const [email, setEmail] = useState<string | null>(null);
  const [aVer, setAVer] = useState(false);
  const [semNovidade, setSemNovidade] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => undefined);
  }, []);

  async function jaPaguei() {
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

  const pagar = precos.filter((p) => p.link);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="card">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rosaSuave">
          <CalendarX2 className="h-5 w-5 text-rosa" />
        </span>

        <h1 className="mb-2 text-2xl font-semibold">A tua assinatura está por renovar</h1>
        <p className="mb-1 text-sm leading-relaxed text-muted">
          A app fica à tua espera. Nada do que fizeste se perdeu — os teus
          estilos, as tuas fotografias e a tua memória continuam onde estavam.
        </p>
        {email && <p className="mb-6 break-all text-xs text-muted">Conta: {email}</p>}

        {pagar.length ? (
          <>
            <div className="mb-4 space-y-2">
              {pagar.map((p) => (
                <a
                  key={p.moeda}
                  href={p.link!}
                  className="btn-primary w-full justify-center"
                  rel="noopener noreferrer"
                >
                  Renovar por {p.valor}
                  <ExternalLink className="h-4 w-4" />
                </a>
              ))}
            </div>
            <p className="mb-6 text-xs leading-relaxed text-muted">
              O pagamento é no Stripe. Assim que passar, o acesso volta sozinho —
              não precisas de avisar ninguém.
            </p>

            <button onClick={jaPaguei} disabled={aVer} className="btn-ghost w-full justify-center">
              <RefreshCw className={`h-4 w-4 ${aVer ? 'animate-spin' : ''}`} />
              {aVer ? 'A ver…' : 'Já paguei, deixa-me entrar'}
            </button>
            {semNovidade && (
              <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                Ainda não chegou o aviso do Stripe. Costuma demorar segundos, mas
                pode levar uns minutos. Volta a tentar daqui a pouco.
              </p>
            )}
          </>
        ) : (
          <p className="rounded-xl bg-creme px-4 py-3 text-sm leading-relaxed text-muted">
            Os pagamentos ainda não estão ligados nesta app. Fala com a Cátia
            para te devolver o acesso.
          </p>
        )}
      </div>

      <a href="/login" className="mt-6 text-center text-xs text-muted underline">
        Sair desta conta
      </a>
    </main>
  );
}
