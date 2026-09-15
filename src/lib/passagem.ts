import { createHmac, timingSafeEqual, randomUUID } from 'crypto';

/**
 * A passagem: como é que o CarouselSnap manda alguém para cá.
 *
 * As duas apps não partilham base de dados nenhuma — são dois Supabase
 * diferentes, e vão continuar a ser. O que partilham é um segredo, e com ele
 * o CarouselSnap escreve um bilhete a dizer «esta pessoa é minha, tem a
 * mensalidade em dia, deixa-a entrar». Aqui confere-se a letra do bilhete e
 * abre-se a porta.
 *
 * O bilhete é uma linha de texto com duas partes separadas por um ponto:
 *
 *     eyJlIjoi…            .    9f86d081884c7d65…
 *     ↑ o recado em base64url   ↑ a assinatura, HMAC-SHA256 do recado
 *
 * O recado é um JSON pequeno:
 *
 *     { "u": "id-no-snap", "e": "alguem@exemplo.com", "n": "Nome",
 *       "ate": 1770000060, "j": "uuid" }
 *
 *     u    o id da pessoa no CarouselSnap — é ISTO que diz quem ela é
 *     e    o email dela, que muda quando ela o mudar de lá
 *     n    o nome, se o souberem (opcional, só serve para dizer olá)
 *     ate  o segundo em que o bilhete deixa de valer
 *     j    um número só dele, para não poder ser usado duas vezes
 *
 * O `u` é opcional só para a ligação poder começar a funcionar antes de o
 * outro lado o mandar. Sem ele, a identidade volta a ser o email — e quem
 * mudar de email passa a ser outra pessoa aqui dentro.
 *
 * Três cuidados, e nenhum deles é acessório:
 *
 * 1. **A assinatura compara-se em tempo constante.** Um `===` desiste no
 *    primeiro byte diferente, e o tempo que demora a desistir diz a quem
 *    tenta adivinhar quantos bytes já acertou.
 *
 * 2. **O bilhete dura um minuto.** Não é para guardar: é para atravessar a
 *    rua. Um minuto chega para o browser saltar de uma app para a outra e não
 *    chega para nada mais.
 *
 * 3. **Cada bilhete serve uma vez.** O `j` fica gasto na tabela `passagens`
 *    assim que é usado. Sem isto, um endereço apanhado no histórico do
 *    browser — ou nos registos de um proxy — voltava a abrir a porta.
 *
 * O segredo (PASSAGEM_SEGREDO) vive no ambiente das duas apps e em mais lado
 * nenhum. Nunca no código, nunca no browser, nunca num NEXT_PUBLIC_.
 */

/**
 * O email com que a conferência da porta marca o que escreve.
 *
 * A conferência gasta um bilhete a sério, porque é a única maneira de provar
 * que a função que gasta bilhetes funciona. Mas isso deixa uma linha na tabela
 * `passagens`, e essa tabela é o que o cartão usa para contar quantas pessoas
 * entraram pela porta.
 *
 * Sem esta marca, cada conferência somava uma entrada — e o cartão passava a
 * dizer «está a funcionar, já entrou gente» por causa das vezes em que a
 * própria Cátia carregou no botão a perguntar se funcionava. Um número que se
 * conta a si próprio é pior do que não ter número nenhum.
 */
export const EMAIL_DA_CONFERENCIA = 'conferencia@porta.interna';

/** Quanto tempo vale um bilhete. Segundos. */
export const VALIDADE = 60;

/**
 * Quanto acesso dá uma passagem.
 *
 * Sete dias, e não para sempre: é isto que faz a subscrição do CarouselSnap
 * ser reconfirmada sozinha. Quem continua a pagar volta a entrar por lá e o
 * prazo empurra-se para a frente sem dar por isso; quem cancela vê a porta
 * fechar-se dentro de uma semana, sem ninguém ter de a ir fechar à mão.
 */
export const DIAS_POR_PASSAGEM = 7;

export interface Recado {
  /** o id da pessoa no CarouselSnap, quando ele o manda */
  u?: string;
  /** email */
  e: string;
  /** nome, se o souberem */
  n?: string;
  /** segundo em que caduca */
  ate: number;
  /** identificador único deste bilhete */
  j: string;
}

function base64url(b: Buffer) {
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64url(s: string) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function assinar(corpo: string, segredo: string) {
  return base64url(createHmac('sha256', segredo).update(corpo, 'utf8').digest());
}

/**
 * Escrever um bilhete.
 *
 * Quem escreve os bilhetes a sério é o CarouselSnap, do lado dele. Isto está
 * aqui por duas razões: os testes provarem que a conferência funciona, e
 * servir de referência exata a quem escrever o outro lado — é este o feitio
 * que tem de sair de lá.
 *
 * E por uma terceira, que corre mesmo em produção: `/api/porta/testar` usa-a
 * para a admin poder experimentar a porta sem depender do CarouselSnap, e
 * saber de que lado está o problema quando há um.
 */
export function escreverPassagem(
  email: string,
  segredo: string,
  extras: { nome?: string; validade?: number; id?: string } = {},
): string {
  const recado: Recado = {
    e: email.trim().toLowerCase(),
    ate: Math.floor(Date.now() / 1000) + (extras.validade ?? VALIDADE),
    j: randomUUID(),
  };
  if (extras.nome) recado.n = extras.nome.trim();
  if (extras.id) recado.u = extras.id.trim();

  const corpo = base64url(Buffer.from(JSON.stringify(recado), 'utf8'));
  return `${corpo}.${assinar(corpo, segredo)}`;
}

export type Leitura =
  | { ok: true; recado: Recado }
  | { ok: false; porque: string };

/**
 * Ler um bilhete, e dizer porque não presta quando não presta.
 *
 * O motivo é para o registo do servidor, não para a pessoa: a quem bate à
 * porta com um bilhete ruim diz-se sempre a mesma coisa, que é que não
 * serve. Explicar qual das contas falhou é ensinar a forjar o próximo.
 */
export function lerPassagem(bilhete: string, segredo: string): Leitura {
  if (!segredo) return { ok: false, porque: 'sem segredo configurado' };

  const partes = String(bilhete ?? '').split('.');
  if (partes.length !== 2) return { ok: false, porque: 'bilhete mal formado' };

  const [corpo, assinatura] = partes;
  const esperada = Buffer.from(assinar(corpo, segredo), 'utf8');
  const recebida = Buffer.from(assinatura, 'utf8');
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) {
    return { ok: false, porque: 'assinatura não bate' };
  }

  let recado: Recado;
  try {
    recado = JSON.parse(deBase64url(corpo).toString('utf8')) as Recado;
  } catch {
    return { ok: false, porque: 'recado ilegível' };
  }

  const email = String(recado.e ?? '').trim().toLowerCase();
  if (!email.includes('@')) return { ok: false, porque: 'sem email' };

  const ate = Number(recado.ate);
  if (!Number.isFinite(ate)) return { ok: false, porque: 'sem validade' };
  const agora = Math.floor(Date.now() / 1000);
  if (ate < agora) return { ok: false, porque: 'bilhete fora de horas' };
  // um bilhete com validade de amanhã não é um bilhete de passagem: ou o
  // relógio de um dos lados está trocado, ou alguém está a guardar bilhetes
  if (ate - agora > VALIDADE * 10) return { ok: false, porque: 'validade esticada de mais' };

  const j = String(recado.j ?? '').trim();
  if (j.length < 8) return { ok: false, porque: 'sem número de bilhete' };

  return {
    ok: true,
    recado: {
      u: String(recado.u ?? '').trim() || undefined,
      e: email,
      n: recado.n?.trim() || undefined,
      ate,
      j,
    },
  };
}

/**
 * O CarouselSnap, e os dois sítios dele que nos interessam.
 *
 * Não é o mesmo endereço para toda a gente, e enganar-se nisto manda a pessoa
 * para o lugar errado no pior momento:
 *
 *   **A porta da rua** (`carouselSnap()`) é para quem ainda não tem nada —
 *   chegou aqui por engano ou com um bilhete que não presta. Leva à página
 *   pública, onde se assina.
 *
 *   **O lugar dela lá dentro** (`voltarAoCarouselSnap()`) é para quem já é
 *   cliente e só quer atravessar a rua de volta. Leva direito ao /main, sem
 *   passar pela página de vendas de uma coisa que ela já comprou.
 */
/**
 * As duas apps vivem no mesmo domínio: o CarouselSnap é a raiz deste
 * endereço e esta app fica debaixo de /creator-works. Por isso os links são
 * relativos — `/` e `/main` — e levam sempre ao CarouselSnap *deste*
 * domínio, seja ele o de produção ou uma pré-visualização. Não há variável
 * de ambiente a mandar aqui: uma `CAROUSELSNAP_URL` esquecida na Vercel
 * punha o botão a apontar para fora, que é exactamente o que se quer evitar.
 */
export function carouselSnap(): string {
  return '/';
}

/** Para onde volta quem já está cá dentro. */
export function voltarAoCarouselSnap(): string {
  return '/main';
}

/**
 * A marca do segredo.
 *
 * Há uma pergunta que decide tudo e que ninguém conseguia responder: o
 * `PASSAGEM_SEGREDO` desta app e o do CarouselSnap são a mesma linha?
 *
 * Se não forem, nenhuma assinatura bate, toda a gente é recusada à porta, e o
 * sintoma é exactamente o mesmo de meia dúzia de outras avarias. A maneira
 * óbvia de conferir — cada lado mostrar o seu e compararem-se — é a única
 * coisa que nunca se pode fazer: um segredo que passa por uma conversa, um
 * email ou um ecrã partilhado deixou de ser segredo, e passa a ser preciso
 * trocá-lo nos dois lados.
 *
 * Isto resolve a pergunta sem ninguém mostrar nada. Assina-se uma frase fixa
 * e pública com o segredo, e mostram-se oito dígitos do resultado. Duas
 * marcas iguais querem dizer dois segredos iguais; duas marcas diferentes
 * querem dizer que um dos lados tem de colar o outro de novo.
 *
 * Porque é que isto não deixa escapar o segredo: o HMAC só anda num sentido.
 * De oito dígitos hexadecimais — trinta e dois bits — não se volta atrás para
 * uma linha de trinta e dois caracteres aleatórios. É a mesma ideia com que
 * se comparam chaves de SSH pela impressão digital, em vez de as mostrar.
 *
 * Oito dígitos chegam para comparar e são curtos de mais para atacar. Podem
 * dar-se ao luxo de colidir — duas linhas diferentes com a mesma marca — e o
 * pior que isso faz é dizer «iguais» a quem depois vai perceber que não
 * estão. O contrário, dizer «diferentes» a segredos iguais, não acontece.
 *
 * A frase que se assina tem uma versão no nome. Se um dia isto mudar, as
 * marcas antigas deixam de bater com as novas, e é preciso que isso se veja.
 */
const FRASE_DA_MARCA = 'the-creator-works/passagem/marca/v1';

export function marcaDoSegredo(segredo?: string): string | null {
  const limpo = (segredo ?? process.env.PASSAGEM_SEGREDO ?? '').trim();
  if (!limpo) return null;

  const digest = createHmac('sha256', limpo).update(FRASE_DA_MARCA, 'utf8').digest('hex');
  // em dois grupos de quatro: lê-se em voz alta sem se perder o sítio
  return `${digest.slice(0, 4)}-${digest.slice(4, 8)}`.toUpperCase();
}

/** Está a passagem ligada? Sem segredo não entra ninguém por aqui. */
export function passagemLigada(): boolean {
  return Boolean(process.env.PASSAGEM_SEGREDO?.trim());
}
