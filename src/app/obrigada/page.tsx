import Link from 'next/link';
import type { Metadata } from 'next';
import { Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'The Creator Works — obrigada',
  description: 'A compra está feita. O acesso vai a caminho do teu email.',
};

/**
 * Onde a Hotmart devolve quem acabou de pagar.
 *
 * Existe para tapar um buraco de alguns segundos que estraga a primeira
 * impressão da app. A pessoa paga, a Hotmart manda-a de volta, e nesse
 * instante a conta dela pode ainda não existir: quem a cria é o aviso que a
 * Hotmart envia ao /api/webhooks/hotmart, e esse chega por outro caminho, sem
 * hora marcada. Sem esta página ela aterrava no login e via um formulário a
 * pedir uma palavra-passe que nunca escolheu, segundos depois de pagar.
 *
 * Então diz-se-lhe o que é verdade: está feito, e o que falta chega por email.
 *
 * Isto não confirma pagamento nenhum — não sabe nada sobre a compra e não
 * pergunta nada à Hotmart. Quem confirma é o aviso assinado, do outro lado.
 * O que esta página faz é só explicar a espera. Por isso também não promete
 * que está tudo bem: diz o que fazer se o email não aparecer.
 *
 * Tem de ser uma porta. Quem chega aqui com uma sessão velha e sem lugar —
 * um aluno que experimentou há meses, alguém que cancelou e voltou — seria
 * posto na rua pela conferência do middleware e mandado para o login, no
 * momento exacto em que acabou de pagar. É o mesmo erro do /entrar, e fica
 * fechado da mesma maneira: o caminho está em lib/portas.ts.
 */
export default function ObrigadaPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="card">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rosaSuave">
          <Mail className="h-5 w-5 text-rosa" />
        </span>

        <h1 className="mb-2 text-2xl font-semibold leading-tight">
          Está feito. Agora vai ao teu email.
        </h1>

        <p className="mb-6 text-sm leading-relaxed text-muted">
          Mandámos um link para o endereço com que pagaste. Carregas nele, escolhes a tua
          palavra-passe, e entras. Não é preciso fazer mais nada aqui.
        </p>

        <div className="rounded-xl bg-creme px-4 py-3 text-sm leading-relaxed text-muted">
          <p className="mb-2 font-semibold text-ink">Se o email não chegar</p>
          <p className="mb-2">
            Dá-lhe uns minutos — às vezes demora — e vê no lixo eletrónico.
          </p>
          <p>
            Se mesmo assim não aparecer, vai ao{' '}
            <Link href="/login" className="underline hover:text-ink">
              login
            </Link>{' '}
            e carrega em <strong className="font-medium text-ink">&quot;Não tenho
            palavra-passe — enviem-me um link para entrar&quot;</strong>, com o mesmo email.
            Entras à mesma.
          </p>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted">
          A primeira coisa que te vai aparecer lá dentro é o briefing — as perguntas que a Cát.IA
          precisa de saber respondidas para escrever como tu, e não como toda a gente. Demora um
          bocado e é o que faz a diferença toda.
        </p>
      </div>
    </main>
  );
}
