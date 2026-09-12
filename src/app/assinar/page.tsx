import Link from 'next/link';
import type { Metadata } from 'next';
import { ExternalLink, Lock } from 'lucide-react';
import { INCLUI, TECTO } from '@/lib/assinatura';
import { INDEPENDENTES } from '@/lib/creditos';
import { carouselSnap } from '@/lib/passagem';

export const metadata: Metadata = {
  title: 'The Creator Works — entra pelo CarouselSnap',
  description: 'Esta app abre-se a partir do CarouselSnap, com a tua subscrição.',
};

/**
 * A porta fechada.
 *
 * Era a página de vendas, e deixou de ser: o Creator Works passou a ser parte
 * do CarouselSnap, e a venda faz-se lá. O que fica aqui é o que uma porta
 * fechada deve fazer — não fingir que não existe, e dizer onde é a entrada.
 *
 * É também onde vai parar quem chega com uma passagem que não presta. Não se
 * lhe diz porquê: a página é a mesma para quem se enganou no endereço, para
 * quem cancelou a subscrição e para quem tentou forjar um bilhete. Explicar
 * qual das contas falhou é ensinar a fazer melhor à segunda.
 */
export const dynamic = 'force-dynamic';

export default function AssinarPage({
  searchParams,
}: {
  searchParams?: { porta?: string };
}) {
  const veioDeUmaPassagemMa = searchParams?.porta === '1';
  const snap = carouselSnap();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="card">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rosaSuave">
          <Lock className="h-5 w-5 text-rosa" />
        </span>

        <h1 className="mb-2 text-2xl font-semibold leading-tight">
          Entra-se aqui pelo CarouselSnap
        </h1>

        {veioDeUmaPassagemMa ? (
          <p className="mb-6 text-sm leading-relaxed text-muted">
            A ligação por onde vieste já não serve — duram pouco de propósito, e
            servem uma vez só. Volta ao CarouselSnap e abre o Creator Works a
            partir de lá; é imediato.
          </p>
        ) : (
          <p className="mb-6 text-sm leading-relaxed text-muted">
            O Creator Works faz parte do CarouselSnap. Não se assina aqui nem se
            entra por aqui: quem tem subscrição ativa lá abre esta app a partir
            de lá, e entra sem ter de escrever palavra-passe nenhuma.
          </p>
        )}

        <a
          href={snap}
          className="btn-primario mb-6 w-full justify-center"
          rel="noopener noreferrer"
        >
          Ir para o CarouselSnap
          <ExternalLink className="h-4 w-4" />
        </a>

        <div className="rounded-xl bg-creme px-4 py-3 text-xs leading-relaxed text-muted">
          <p className="mb-2 font-semibold text-ink">O que te espera do lado de cá</p>
          <ul className="space-y-1">
            {INCLUI.map((linha) => (
              <li key={linha}>· {linha}</li>
            ))}
          </ul>
          <p className="mt-2">{TECTO}.</p>
          <p className="mt-2">{INDEPENDENTES}</p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        Já entraste aqui antes e tens palavra-passe?{' '}
        <Link href="/login" className="underline hover:text-ink">
          Entra por aqui
        </Link>
      </p>
    </main>
  );
}
