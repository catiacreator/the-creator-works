import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, KeyRound } from 'lucide-react';
import { comBase } from '@/lib/caminho';

export const metadata: Metadata = {
  title: 'The Creator Works',
  description: 'Entra na tua conta ou cria uma.',
};

/**
 * A porta de entrada de quem vem do CarouselSnap.
 *
 * Aqui chegava-se à página de vendas. Fazia sentido enquanto o plano era
 * vender aqui — mas quem vem do Snap já pagou, e mostrar-lhe um preço é
 * dizer-lhe que o dinheiro dela não conta. Agora chega a esta página, que
 * não vende nada e só pergunta uma coisa: já cá tens conta, ou não?
 *
 * Duas portas e mais nada. Sem explicações do que correu mal, sem motivos
 * técnicos, sem nada para ler — quem aqui chega quer entrar, não quer
 * perceber. O motivo verdadeiro fica anotado do lado da Cátia, no cartão da
 * porta em Admin, que é onde serve para alguma coisa.
 */
export default function BemVindoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* eslint-disable @next/next/no-img-element */}
        <img
          src={comBase('/the-creator-works.png')}
          alt="The Creator Works"
          className="mb-3 h-9 w-auto dark:hidden"
        />
        <img
          src={comBase('/the-creator-works-escuro.png')}
          alt="The Creator Works"
          className="mb-3 hidden h-9 w-auto dark:block"
        />
        {/* eslint-enable @next/next/no-img-element */}

        <p className="mb-8 text-sm leading-relaxed text-muted">
          Já cá tens conta, ou é a primeira vez?
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rosa px-4 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-dark"
          >
            Iniciar sessão
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/registar"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-sand bg-white px-4 py-3.5 text-sm font-semibold text-ink transition hover:border-rosa dark:bg-transparent"
          >
            Criar conta
          </Link>
        </div>

        {/*
          O código, para quem tem um.

          Criar conta deixou de precisar dele — mas quem recebeu um continua a
          poder usá-lo, e um código traz consigo o papel com que a pessoa
          entra. Fica pequeno e em baixo: é o caminho de poucos.
        */}
        <p className="mt-6 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Recebeste um código de convite?{' '}
            <Link href="/acesso" className="underline underline-offset-2 hover:text-ink">
              Usa-o aqui
            </Link>
            .
          </span>
        </p>

        {/*
          A saída, para quem chega aqui com uma sessão velha em cima. É uma
          das causas de não se entrar automaticamente, e sem isto a pessoa
          tenta, falha, e volta ao mesmo sítio para sempre.
        */}
        <p className="mt-8 text-center text-[12px] text-muted">
          Estavas a entrar e voltaste aqui?{' '}
          <a href={comBase('/sair')} className="underline underline-offset-2 hover:text-ink">
            Fecha a sessão aberta
          </a>
          .
        </p>
      </div>
    </div>
  );
}
