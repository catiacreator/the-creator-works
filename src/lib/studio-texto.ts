/**
 * Negrito, itálico e sublinhado dentro do texto de um slide.
 *
 * O texto de um slide é uma string — está assim no rascunho, no zip, na
 * legenda, em todo o lado. Para poder marcar só algumas palavras sem partir
 * isso tudo, as marcas vivem dentro da própria string, à maneira do markdown:
 *
 *   **negrito**      *itálico*      __sublinhado__
 *
 * Quem escreve as marcas são os botões do cartão do slide, não a Cátia. Ela
 * seleciona as palavras e carrega no B, no I ou no S.
 *
 * As marcas encaixam umas nas outras: `**__a__**` é negrito e sublinhado.
 */

export interface Marcas {
  negrito?: boolean;
  italico?: boolean;
  sublinhado?: boolean;
}

export interface Trecho extends Marcas {
  texto: string;
}

export type Marca = 'negrito' | 'italico' | 'sublinhado';

/** O que se escreve à volta das palavras, por marca. */
export const SINAIS: Record<Marca, string> = {
  negrito: '**',
  italico: '*',
  sublinhado: '__',
};

/**
 * O `**` tem de ser tentado antes do `*`, senão `**a**` lia-se como um
 * itálico vazio seguido de outro. O `s` não é preciso: `[\s\S]` já apanha as
 * mudanças de linha, e assim funciona em qualquer browser.
 */
const MARCADO = /(\*\*|__|\*)([\s\S]+?)\1/;

function juntar(base: Marcas, sinal: string): Marcas {
  if (sinal === '**') return { ...base, negrito: true };
  if (sinal === '__') return { ...base, sublinhado: true };
  return { ...base, italico: true };
}

function partir(texto: string, base: Marcas, saida: Trecho[]) {
  let resto = texto;
  while (resto) {
    const m = MARCADO.exec(resto);
    if (!m) {
      saida.push({ ...base, texto: resto });
      return;
    }
    if (m.index > 0) saida.push({ ...base, texto: resto.slice(0, m.index) });
    partir(m[2], juntar(base, m[1]), saida);
    resto = resto.slice(m.index + m[0].length);
  }
}

/** O texto partido nos pedaços que se desenham de maneiras diferentes. */
export function lerTrechos(texto: string): Trecho[] {
  const saida: Trecho[] = [];
  partir(String(texto ?? ''), {}, saida);
  return saida.filter((t) => t.texto.length > 0);
}

/** O mesmo texto sem as marcas — para a legenda, os nomes de ficheiro, a IA. */
export function semMarcas(texto: string): string {
  return lerTrechos(texto)
    .map((t) => t.texto)
    .join('');
}

/**
 * Põe (ou tira) uma marca à volta do que está selecionado.
 *
 * Devolve o texto novo e onde a seleção passa a estar, para o cursor não
 * saltar para o princípio a cada carregar de botão.
 */
export function envolver(
  texto: string,
  inicio: number,
  fim: number,
  marca: Marca,
): { texto: string; inicio: number; fim: number } {
  const sinal = SINAIS[marca];
  const antes = texto.slice(0, inicio);
  const meio = texto.slice(inicio, fim);
  const depois = texto.slice(fim);

  /** O `*` do itálico não pode confundir-se com o `**` do negrito. */
  const acabaEm = (s: string) =>
    s.endsWith(sinal) && (marca !== 'italico' || !s.endsWith('**'));
  const comecaPor = (s: string) =>
    s.startsWith(sinal) && (marca !== 'italico' || !s.startsWith('**'));

  // a seleção já traz as marcas dentro: tira-as
  if (
    meio.length > sinal.length * 2 &&
    comecaPor(meio) &&
    acabaEm(meio) &&
    meio.slice(sinal.length, -sinal.length).length > 0
  ) {
    const limpo = meio.slice(sinal.length, -sinal.length);
    return { texto: antes + limpo + depois, inicio, fim: inicio + limpo.length };
  }

  // as marcas estão logo à volta da seleção: tira-as também
  if (acabaEm(antes) && comecaPor(depois)) {
    const novoAntes = antes.slice(0, -sinal.length);
    return {
      texto: novoAntes + meio + depois.slice(sinal.length),
      inicio: novoAntes.length,
      fim: novoAntes.length + meio.length,
    };
  }

  return {
    texto: `${antes}${sinal}${meio}${sinal}${depois}`,
    inicio: inicio + sinal.length,
    fim: fim + sinal.length,
  };
}
