import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Check, ExternalLink, Lock, Mail } from 'lucide-react';
import { GUARDA, INCLUI, TECTO, haOndePagar, precos } from '@/lib/assinatura';
import { INDEPENDENTES } from '@/lib/creditos';
import { carouselSnap } from '@/lib/passagem';

export const metadata: Metadata = {
  title: 'The Creator Works — assinar',
  description: 'Carrosséis de Instagram em massa, no teu template. Assina e entra.',
};

/**
 * Onde se compra.
 *
 * Esta página já foi três coisas. Foi página de vendas; depois o Creator Works
 * passou a ser parte do CarouselSnap e ela virou uma porta fechada a dizer
 * «entra-se por lá»; e agora volta a vender, porque quem quer só esta app tem
 * de a poder comprar sem ter de assinar outra primeiro.
 *
 * As duas entradas passam a conviver, e a ordem em que aparecem é a resposta
 * à pergunta que a pessoa tem na cabeça:
 *
 *   **Quem não tem nada** quer saber quanto custa e onde carrega. É o que vem
 *   primeiro, em cima, com os preços à vista.
 *
 *   **Quem já paga o Pro do CarouselSnap** não tem de pagar outra vez — para
 *   essa pessoa isto já está comprado, e o que ela precisa é do caminho de
 *   volta. Fica em baixo, separado, para não parecer uma segunda compra.
 *
 * Quem cobra é a Hotmart, e não há chave nenhuma dela neste código. Os links
 * de pagamento são endereços públicos feitos no painel, e é tudo o que a app
 * precisa de saber: o dinheiro é tratado lá, e o que volta é o aviso assinado
 * que o /api/webhooks/hotmart confere — o mesmo que já dava acesso a quem
 * comprava por lá antes de esta página existir.
 */
export const dynamic = 'force-dynamic';

export default function AssinarPage({
  searchParams,
}: {
  searchParams?: { porta?: string };
}) {
  const veioDeUmaPassagemMa = searchParams?.porta === '1';
  const snap = carouselSnap();
  const lista = precos();
  const daParaPagar = haOndePagar(lista);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {/*
        A ligação do CarouselSnap não foi aceite.

        Fica em cima de tudo porque é a razão pela qual esta pessoa está aqui,
        e não se lhe diz qual das sete contas falhou — explicar isso é ensinar
        a forjar a próxima. Mas também não se inventa uma causa: o motivo
        verdadeiro fica anotado para a Cátia, no cartão da porta em Admin.
      */}
      {veioDeUmaPassagemMa && (
        <div className="mb-8 flex gap-3 rounded-2xl border border-sand bg-creme px-4 py-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />
          <p className="text-sm leading-relaxed text-muted">
            A ligação por onde vieste não foi aceite. Se tens o Pro do CarouselSnap, volta lá e
            abre o Creator Works outra vez — as ligações duram pouco de propósito, e quase sempre
            uma nova resolve. Se voltar a acontecer, diz à Cátia: do lado dela fica registado o
            motivo.
          </p>
        </div>
      )}

      {/* eslint-disable @next/next/no-img-element */}
      <img
        src="/the-creator-works.png"
        alt="The Creator Works"
        className="mb-3 h-9 w-auto dark:hidden"
      />
      <img
        src="/the-creator-works-escuro.png"
        alt="The Creator Works"
        className="mb-3 hidden h-9 w-auto dark:block"
      />
      {/* eslint-enable @next/next/no-img-element */}

      <h1 className="mb-2 text-3xl font-semibold leading-tight">
        Carrosséis de Instagram em massa, no teu template.
      </h1>
      <p className="mb-8 text-base leading-relaxed text-muted">
        Colas um documento, saem os slides — escritos na tua voz e desenhados no teu molde. A
        conta cria-se aqui, e o acesso é imediato.
      </p>

      {/* ── os preços ───────────────────────────────── */}
      {daParaPagar ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {lista
            .filter((p) => p.link)
            .map((p) => (
              <div key={p.moeda} className="card flex flex-col">
                {/*
                  Sem preço configurado não se inventa um número: diz-se que
                  ele aparece a seguir, e o checkout diz qual é. Um número
                  errado aqui é uma pessoa a pagar uma coisa a pensar que
                  combinou outra.
                */}
                {p.valor ? (
                  <>
                    <p className="text-3xl font-semibold leading-none">{p.valor}</p>
                    <p className="mb-4 mt-1 text-xs text-muted">{p.nota}</p>
                  </>
                ) : (
                  <p className="mb-4 text-sm leading-relaxed text-muted">
                    Mensalidade. O preço aparece no passo seguinte, antes de pagares seja o que
                    for.
                  </p>
                )}
                <a
                  href={p.link!}
                  className="btn-primario mt-auto w-full justify-center"
                  rel="noopener noreferrer"
                >
                  Assinar
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ))}
        </div>
      ) : (
        /*
          Sem link posto no ambiente não se manda ninguém para lado nenhum.
          Um botão que não leva a sítio nenhum é pior do que a ausência dele:
          a pessoa carrega, não acontece nada, e vai-se embora a achar que a
          app está partida.
        */
        <div className="card mb-8">
          <p className="text-sm leading-relaxed text-muted">
            As assinaturas por aqui ainda não estão abertas. Se queres entrar já, fala com a
            Cátia — ou, se tens o Pro do CarouselSnap, entra por lá em baixo.
          </p>
        </div>
      )}

      {/* ── o que vem com isto ──────────────────────── */}
      <div className="card mb-8">
        <p className="mb-3 font-medium">O que vem com a assinatura</p>
        <ul className="space-y-2">
          {INCLUI.map((linha) => (
            <li key={linha} className="flex gap-2.5 text-sm leading-relaxed">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{linha}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted">{TECTO}.</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Guarda {GUARDA.join(', ')}.
        </p>
      </div>

      {/* ── o que acontece depois de pagar ──────────── */}
      {daParaPagar && (
        <div className="mb-8 rounded-2xl border border-sand bg-creme px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted" />
            <p className="font-medium">O que acontece depois de pagares</p>
          </div>
          <ol className="space-y-1.5 text-sm leading-relaxed text-muted">
            <li>1. Recebes um email no endereço com que pagaste.</li>
            <li>2. Carregas no link e escolhes a tua palavra-passe.</li>
            <li>3. Respondes ao briefing — é o que a Cát.IA precisa de saber para escrever como tu.</li>
            <li>4. E está.</li>
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Se o email demorar, vê no lixo eletrónico. A assinatura cancela-se quando quiseres,
            pelo mesmo sítio onde a fizeste.
          </p>
        </div>
      )}

      {/* ── a outra entrada ─────────────────────────── */}
      <div className="rounded-2xl border border-sand px-5 py-4">
        <p className="mb-1 font-medium">Já pagas o Pro do CarouselSnap?</p>
        <p className="mb-3 text-sm leading-relaxed text-muted">
          Então isto já é teu — não assines outra vez. Abre o Creator Works a partir de lá e
          entras sem escrever palavra-passe nenhuma.
        </p>
        <a href={snap} className="btn-fantasma" rel="noopener noreferrer">
          Ir para o CarouselSnap
          <ExternalLink className="h-4 w-4" />
        </a>
        <p className="mt-3 text-xs leading-relaxed text-muted">{INDEPENDENTES}</p>
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-muted">
        Já tens conta aqui?{' '}
        <Link href="/login" className="underline hover:text-ink">
          Entra por aqui
        </Link>
      </p>
    </main>
  );
}
