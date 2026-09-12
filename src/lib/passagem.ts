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
 *     { "e": "alguem@exemplo.com", "n": "Nome", "ate": 1770000060, "j": "uuid" }
 *
 *     e    o email da pessoa, que é o que as duas apps têm em comum
 *     n    o nome, se o souberem (opcional, só serve para dizer olá)
 *     ate  o segundo em que o bilhete deixa de valer
 *     j    um número só dele, para não poder ser usado duas vezes
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
 * Isto não corre em produção — quem escreve os bilhetes a sério é o
 * CarouselSnap, do lado dele. Está aqui para os testes poderem provar que a
 * conferência funciona, e para servir de referência exata a quem escrever o
 * outro lado: é este o feitio que tem de sair de lá.
 */
export function escreverPassagem(
  email: string,
  segredo: string,
  extras: { nome?: string; validade?: number } = {},
): string {
  const recado: Recado = {
    e: email.trim().toLowerCase(),
    ate: Math.floor(Date.now() / 1000) + (extras.validade ?? VALIDADE),
    j: randomUUID(),
  };
  if (extras.nome) recado.n = extras.nome.trim();

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

  return { ok: true, recado: { e: email, n: recado.n?.trim() || undefined, ate, j } };
}

/** O sítio de onde vêm as pessoas. Lido a cada pedido, do lado do servidor. */
export function carouselSnap(): string {
  return process.env.CAROUSELSNAP_URL?.trim() || 'https://carouselsnap.lovable.app';
}

/** Está a passagem ligada? Sem segredo não entra ninguém por aqui. */
export function passagemLigada(): boolean {
  return Boolean(process.env.PASSAGEM_SEGREDO?.trim());
}
