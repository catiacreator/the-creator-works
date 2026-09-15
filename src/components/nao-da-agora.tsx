import { CloudOff } from 'lucide-react';
import { comBase } from '@/lib/caminho';

/**
 * O que se vê quando a app não consegue falar com a base de dados.
 *
 * É a página de um momento mau, e a única coisa que ela tem de fazer bem é
 * não mentir. Não diz que a pessoa não tem acesso — não sabemos isso, e
 * dizê-lo a quem está a pagar é o pior recado que esta app pode dar. Não a
 * põe na rua, não lhe fecha a sessão, não lhe mostra o trabalho dela vazio
 * como se tivesse desaparecido.
 *
 * Diz o que é: não deu agora. E mantém-se fora do caminho para que, quando
 * voltar, esteja tudo onde estava.
 */
export function NaoDaAgora() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-creme text-ink">
        <CloudOff className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        A app não está a responder
      </h1>
      <p className="mb-6 text-[15px] leading-relaxed text-muted">
        É um problema nosso, e passageiro. A tua conta está bem e o teu
        trabalho está todo onde estava — nada disto se perdeu. Espera um
        minuto e volta a carregar.
      </p>
      <a href={comBase('/')} className="btn-primario mx-auto justify-center">
        Tentar outra vez
      </a>
    </main>
  );
}
