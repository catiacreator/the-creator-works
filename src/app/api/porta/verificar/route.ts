import { NextResponse } from 'next/server';
import { VALIDADE, lerPassagem, marcaDoSegredo } from '@/lib/passagem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * As duas apps a falarem-se diretamente.
 *
 * Até aqui, para saber se o CarouselSnap e o Creator Works estavam de acordo,
 * era preciso uma pessoa no meio: a Cátia a ir ao painel da Vercel, a copiar
 * uma marca de um cartão de Admin, a mandá-la por conversa a quem faz o outro
 * lado, e a esperar que ele calculasse a dele com a mesma receita — e a
 * primeira vez que tentámos isso, a tabela dos vectores chegou lá desalinhada
 * e a conclusão saiu errada.
 *
 * Três traduções humanas para uma pergunta que as máquinas sabem responder
 * uma à outra.
 *
 * Isto é a pergunta, feita diretamente:
 *
 *     GET /api/porta/verificar?t=BILHETE
 *
 * Quem faz o CarouselSnap escreve um bilhete como escreveria a sério, chama
 * este endereço com ele, e fica a saber se a assinatura bate deste lado.
 * Ninguém mostra a chave a ninguém, e ninguém a copia para lado nenhum.
 *
 * ── O que isto NÃO faz, de propósito ─────────────────────────
 *
 * Não gasta o bilhete. Não dá acesso. Não abre sessão. Não toca na base de
 * dados. Lê a assinatura e responde. É a conferência da porta sem a porta,
 * para se poder experimentar mil vezes sem consequência nenhuma.
 *
 * ── Porque é que pode ser público ────────────────────────────
 *
 * Duas coisas que parecem imprudentes e não são.
 *
 * **Dizer se uma assinatura bate.** Quem quisesse saber isso já podia
 * perguntar ao /entrar: chega lá com um bilhete e vê se entra ou se cai na
 * página de assinatura. O sinal já existia; isto só o torna legível, e sem
 * gastar nada. E dizer «não bate» a quem forjou uma assinatura não lhe ensina
 * nada — num HMAC não há «quase certo», não há um byte a mais acertado que dê
 * pista para o seguinte.
 *
 * **Mostrar a marca.** É uma função de sentido único do segredo, com trinta e
 * dois bits de saída. De lá não se volta para uma linha de sessenta e quatro
 * caracteres aleatórios, e quem tivesse o segredo para experimentar contra a
 * marca já não precisava da marca.
 *
 * O que nunca sai daqui é o segredo, e esse continua a não sair.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const segredo = process.env.PASSAGEM_SEGREDO?.trim();
  const marca = marcaDoSegredo();
  const agora = Math.floor(Date.now() / 1000);

  if (!segredo) {
    return NextResponse.json({
      ok: false,
      assinatura: 'impossível conferir',
      porque: 'este lado não tem PASSAGEM_SEGREDO configurado',
      marca: null,
      agora,
    });
  }

  const bilhete = searchParams.get('t') ?? searchParams.get('token') ?? '';

  // sem bilhete, responde-se na mesma: serve para ver a marca e acertar
  // relógios antes sequer de se escrever o primeiro
  if (!bilhete) {
    return NextResponse.json({
      ok: null,
      assinatura: 'não veio bilhete nenhum',
      comoUsar: '/api/porta/verificar?t=BILHETE',
      marca,
      agora,
      validadeMaxima: VALIDADE * 10,
      recado:
        'Manda um bilhete no ?t= e eu digo se a assinatura bate. Não o gasto, ' +
        'não dou acesso nenhum, e podes repetir as vezes que quiseres.',
    });
  }

  const leitura = lerPassagem(bilhete, segredo);

  if (leitura.ok) {
    return NextResponse.json({
      ok: true,
      assinatura: 'bate',
      marca,
      agora,
      // o que se leu lá dentro, para se confirmar que o recado vai com o
      // feitio certo — o email é o que o próprio emissor lá pôs
      recado: {
        email: leitura.recado.e,
        temIdDoSnap: Boolean(leitura.recado.u),
        segundosAteCaducar: leitura.recado.ate - agora,
      },
      nota: 'Este bilhete NÃO foi gasto. Serve à mesma para entrar a sério.',
    });
  }

  /**
   * Porque é que não bateu.
   *
   * Aqui diz-se, ao contrário do que se faz a quem bate à porta. Quem chama
   * este endereço está a construir o outro lado da ligação, e o motivo é a
   * única coisa que lhe interessa. Esconder-lho era obrigá-lo a adivinhar —
   * que foi exactamente o que nos custou um dia.
   */
  const arranjos: Record<string, string> = {
    'assinatura não bate':
      'O PASSAGEM_SEGREDO não é a mesma linha nos dois lados. Compara a marca ' +
      'que vem nesta resposta com a que calculas do teu segredo: se forem diferentes, é isso.',
    'bilhete fora de horas':
      'A assinatura estava boa — o relógio é que não. Vê o campo `agora` desta resposta ' +
      'contra o teu, e o `ate` que puseste no recado.',
    'validade esticada de mais':
      `O bilhete vale mais tempo do que este lado aceita. O tecto são ${VALIDADE * 10} segundos.`,
    'bilhete mal formado': 'O bilhete tem de ser recado.assinatura — duas partes, um ponto no meio.',
    'recado ilegível': 'A primeira parte tem de ser o JSON em base64url.',
    'sem email': 'Falta o campo `e` no recado.',
    'sem validade': 'Falta o campo `ate` no recado — o segundo em que caduca.',
    'sem número de bilhete': 'Falta o campo `j` — um identificador único deste bilhete.',
  };

  return NextResponse.json({
    ok: false,
    assinatura: 'não bate',
    porque: leitura.porque,
    arranjo: arranjos[leitura.porque] ?? null,
    marca,
    agora,
  });
}
