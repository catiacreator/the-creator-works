import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Clapperboard, Images } from 'lucide-react';
import { carouselSnap } from '@/lib/passagem';

export const metadata: Metadata = {
  title: 'Por onde queres começar?',
  description: 'O CarouselSnap e o The Creator Works.',
};

export const dynamic = 'force-dynamic';

/**
 * Os dois sítios, lado a lado.
 *
 * São duas apps e não uma, e esta página não finge o contrário: cada cartão
 * diz o que se faz lá dentro, e o do CarouselSnap traz a setinha que avisa
 * que se sai daqui. Uma pessoa que carregue tem de saber para onde vai antes
 * de carregar, e não depois.
 *
 * É uma porta — quem cá chega ainda não entrou em lado nenhum, e pôr isto
 * atrás da conferência era trancá-la com a chave lá dentro.
 */

export default function InicioPage() {
  const snap = carouselSnap();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        {/* eslint-disable @next/next/no-img-element */}
        <img
          src="/the-creator-works.png"
          alt="The Creator Works"
          className="mb-3 h-8 w-auto dark:hidden"
        />
        <img
          src="/the-creator-works-escuro.png"
          alt="The Creator Works"
          className="mb-3 hidden h-8 w-auto dark:block"
        />
        {/* eslint-enable @next/next/no-img-element */}

        <h1 className="mb-1 text-2xl font-semibold text-ink">Por onde queres começar?</h1>
        <p className="mb-8 text-sm text-muted">São dois sítios, e a conta é a mesma pessoa.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* ── o Creator Works ─────────────────────── */}
          <Link
            href="/criar"
            className="card group flex flex-col gap-4 transition hover:border-rosa hover:shadow-lift"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: '#D6528A' }}
            >
              <Clapperboard className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-semibold text-ink">The Creator Works</span>
              <span className="mt-1 block text-sm leading-snug text-muted">
                Roteiros, carrosséis e legendas escritos na tua voz, com a Cát.IA.
              </span>
            </span>
          </Link>

          {/* ── o CarouselSnap ──────────────────────── */}
          {/*
            Abre no mesmo separador, de propósito. Um site que se abre sozinho
            noutro lado deixa a pessoa com dois separadores abertos e sem
            perceber qual é qual — e o caminho de volta está lá do outro lado.
          */}
          <a
            href={snap}
            className="card group flex flex-col gap-4 transition hover:border-[#ff3b00] hover:shadow-lift"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: '#ff3b00' }}
            >
              <Images className="h-6 w-6" />
            </span>
            <span>
              <span className="flex items-center gap-1.5 text-lg font-semibold text-ink">
                Carousel Snap
                <ArrowUpRight className="h-4 w-4 text-muted transition group-hover:text-[#ff3b00]" />
              </span>
              <span className="mt-1 block text-sm leading-snug text-muted">
                Carrosséis com IA a partir de um tema ou de um documento, no teu template.
              </span>
            </span>
          </a>
        </div>

        <p className="mt-8 text-center text-[12.5px] text-muted">
          Ainda não tens conta?{' '}
          <Link href="/registar" className="underline underline-offset-2 hover:text-ink">
            Cria uma aqui
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
