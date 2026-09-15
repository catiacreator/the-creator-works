import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * O convite a responder ao Sobre mim.
 *
 * Isto já foi um portão: quem não tivesse o briefing respondido encontrava a
 * app inteira cinzenta e era mandado para o Sobre mim sem ter visto nada. A
 * intenção era boa — a Cát.IA escreve mal sem saber para quem escreve — mas o
 * preço era alto: quem chega do CarouselSnap paga, entra, e a primeira coisa
 * que vê é uma parede.
 *
 * Agora está tudo aberto e isto fica por cima, em todas as páginas, até estar
 * respondido. Quem quiser passear passeia; quem quiser bons textos sabe onde
 * carregar. É um aviso, não uma fechadura.
 */
export function FaltaOSobreMim({ quantos }: { quantos: number }) {
  return (
    <Link
      href="/perfil"
      className="mb-6 flex items-center gap-3 rounded-2xl border border-[#E4D9FF] bg-[#F3EDFF] px-4 py-3 text-sm transition hover:border-[#c9b4ff]"
    >
      <span className="text-ink">
        <strong className="font-semibold">Falta responder ao Sobre mim.</strong>{' '}
        {quantos === 1
          ? 'Falta uma pergunta'
          : `Faltam ${quantos} perguntas`}{' '}
        — é daí que a Cát.IA sabe para quem está a escrever. Sem isso, escreve
        para toda a gente.
      </span>
      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[#8B5CF6]" />
    </Link>
  );
}
