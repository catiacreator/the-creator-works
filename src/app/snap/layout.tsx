import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getUser } from '@/lib/supabase/server';
import './snap.css';

/**
 * A casca do CarouselSnap, dentro do Creator Works.
 *
 * O Snap está a mudar-se para cá, e a regra é uma só: vem tal e qual, e não
 * se mistura com o que já cá estava. Por isso tem casca própria — o desenho
 * dele, o menu dele, as cores dele — e não passa pelo layout do Creator
 * Works. Nem o inverso: nada do que está aqui dentro toca no que já existe.
 *
 * O que os dois partilham é uma coisa só: **a conta**. A pessoa entra uma
 * vez e tem os dois lados. Sem isso seriam dois sites, e não é isso que se
 * quer — quer-se uma casa com duas divisões.
 *
 * Não há aqui a conferência do briefing que o Creator Works faz. É de
 * propósito: o briefing é o que a Cát.IA precisa de saber para escrever, e
 * é uma exigência desse lado. Obrigar alguém a responder a vinte e uma
 * perguntas antes de ver o Snap era trazer para cá uma regra que lá nunca
 * existiu.
 */
export default async function SnapLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <div className="snap font-sans">
      <header className="sticky top-0 z-10 border-b border-snapBorda bg-snapCartao/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3">
          <Link href="/snap" className="text-[15px] font-semibold tracking-tight text-snapTexto">
            CarouselSnap
          </Link>

          <nav className="flex items-center gap-1 text-[13px]">
            <Link
              href="/snap/drop"
              className="rounded-full px-3 py-1.5 text-snapApagado transition-colors hover:bg-snapSuave hover:text-snapTexto"
            >
              Drop Content
            </Link>
            <Link
              href="/snap"
              className="rounded-full px-3 py-1.5 text-snapApagado transition-colors hover:bg-snapSuave hover:text-snapTexto"
            >
              Ganchos
            </Link>
          </nav>

          {/*
            A travessia para o outro lado.
            Fica à direita e com o nome da app de destino, para quem carrega
            saber onde vai parar. É um sítio diferente, não um separador.
          */}
          <Link
            href="/criar"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-snapDestaque px-3.5 py-1.5 text-[12.5px] font-medium text-snapSobreDestaque transition-opacity hover:opacity-90"
          >
            The Creator Works
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
