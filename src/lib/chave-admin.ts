import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { MINIMO_CHAVE_ADMIN } from './limites';

/**
 * A chave da porta de serviço.
 *
 * Um código que a Cátia escolhe e escreve em `/admin-login` para entrar sem
 * passar pelo CarouselSnap. É a única maneira de entrar nesta app sem um
 * bilhete assinado, e por isso tudo aqui é feito a pensar no dia em que
 * alguém descobrir que a página existe.
 *
 * **O código não se guarda.** Guarda-se um `scrypt` dele, com sal próprio.
 * Quem levar a tabela leva sal e resumos: para descobrir o código tem de o
 * adivinhar e passar cada tentativa pelo scrypt, e é isso que torna a conta
 * impossível de fazer em tempo útil.
 *
 * Porquê scrypt e não HMAC. Um HMAC era mais rápido e deixava procurar a
 * chave por índice, em vez de comparar linha a linha. Mas um HMAC é rápido
 * para quem confere **e** para quem adivinha: uma máquina faz milhões por
 * segundo. O scrypt custa memória de propósito, e esse custo paga-se uma vez
 * por entrada e milhões de vezes a quem tenta forçar. São dois ou três
 * milissegundos do lado de cá contra semanas do lado de lá.
 *
 * E como são poucas admins — uma, hoje — comparar linha a linha não custa
 * nada.
 */

/** Quanto custa passar um código pelo scrypt. */
const CUSTO = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const BYTES = 64;

/** O tamanho mínimo de um código. Vive em `limites.ts`, que o browser pode ler. */
export const MINIMO = MINIMO_CHAVE_ADMIN;

/** Letras e números sem os que se confundem a ler: sem 0/O, sem 1/I/l. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/**
 * Inventar um código bom.
 *
 * Quatro grupos de cinco, com hífenes, para se conseguir ler em voz alta e
 * escrever à mão sem enganos. Vinte caracteres deste alfabeto são cerca de
 * 114 bits — muito acima do que qualquer pessoa escolhe de cabeça.
 */
export function inventarCodigo(): string {
  const bytes = randomBytes(20);
  let c = '';
  for (const b of bytes) c += ALFABETO[b % ALFABETO.length];
  return [c.slice(0, 5), c.slice(5, 10), c.slice(10, 15), c.slice(15, 20)].join('-');
}

/**
 * O que está mal com este código, se estiver alguma coisa.
 *
 * Devolve a queixa por extenso, para se poder mostrar à pessoa, ou null se
 * o código serve.
 */
export function queixaDoCodigo(codigo: string): string | null {
  const c = String(codigo ?? '').normalize('NFKC').trim();
  if (!c) return 'Escreve um código.';
  if (c.length < MINIMO) return `O código tem de ter pelo menos ${MINIMO} caracteres.`;
  if (c.length > 200) return 'O código é comprido de mais.';
  if (/\s/.test(c)) return 'O código não pode ter espaços — confundem-se a escrever.';
  if (new Set(c).size < 5) return 'O código repete-se de mais. Mistura mais letras e números.';
  return null;
}

/**
 * Preparar um código para ser guardado.
 *
 * O `normalize('NFKC')` não é um enfeite: o mesmo caractere acentuado pode
 * chegar escrito de duas maneiras diferentes conforme o teclado e o sistema,
 * e sem isto um código com acentos podia ser guardado de uma maneira e
 * escrito de outra — e nunca mais abrir a porta.
 */
export function prepararChave(codigo: string): { sal: string; resumo: string } {
  const sal = randomBytes(16).toString('hex');
  return { sal, resumo: resumir(codigo, sal) };
}

function resumir(codigo: string, sal: string): string {
  return scryptSync(String(codigo).normalize('NFKC').trim(), sal, BYTES, CUSTO).toString('hex');
}

/**
 * Bate este código com esta chave?
 *
 * A comparação é em tempo constante. Um `===` desiste no primeiro byte
 * diferente, e o tempo que demora a desistir diz a quem tenta quantos bytes
 * já acertou — que é como se descasca um segredo sem nunca o adivinhar de
 * uma vez.
 */
export function confereChave(codigo: string, sal: string, resumo: string): boolean {
  if (!codigo || !sal || !resumo) return false;

  let calculado: Buffer;
  try {
    calculado = Buffer.from(resumir(codigo, sal), 'hex');
  } catch {
    return false;
  }

  const guardado = Buffer.from(resumo, 'hex');
  if (guardado.length !== calculado.length || guardado.length === 0) return false;
  return timingSafeEqual(guardado, calculado);
}
