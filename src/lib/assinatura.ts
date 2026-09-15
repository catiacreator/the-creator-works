/**
 * O preço, e para onde se vai pagar.
 *
 * Quem cobra é a Hotmart. Os links são os do checkout dela, feitos no painel
 * e postos no ambiente — não há aqui chave nenhuma, só endereços públicos,
 * que é o que um link de pagamento é. Sem eles as páginas dizem-se por
 * configurar em vez de mandarem alguém para lado nenhum.
 *
 * Os nomes antigos, `STRIPE_LINK_*`, continuam a valer como segunda escolha.
 * Houve uma altura em que quem cobrava era a Stripe, e o webhook dela ainda
 * cá está a funcionar; trocar a cobrança não pode ser uma coisa que parte a
 * app enquanto as variáveis não forem renomeadas à mão no painel.
 *
 * São lidos do lado do servidor, a cada pedido, e não com o prefixo
 * NEXT_PUBLIC. Se levassem esse prefixo ficavam cozidos dentro do JavaScript
 * na altura da compilação, e trocar um link obrigava a publicar a app outra
 * vez. Assim troca-se no painel da Vercel e vale no pedido seguinte.
 */

import { TECTO_CREDITOS } from './creditos';

export interface Preco {
  /** o que se mostra. Nulo quando não se sabe — e aí não se inventa */
  valor: string | null;
  moeda: string;
  /** para onde vai o botão */
  link: string | null;
  nota: string;
}

/**
 * O checkout da Hotmart, por omissão.
 *
 * Está aqui em vez de ser só uma variável de ambiente por uma razão prática:
 * assim a página vende no minuto em que for publicada, sem depender de
 * ninguém ir ao painel da Vercel colar nada. Não é segredo — é o endereço
 * que qualquer pessoa vê na barra do browser quando vai pagar.
 *
 * E continua a poder ser trocado sem mexer no código: a variável ganha
 * sempre, para o dia em que a oferta mudar de código e isto não poder
 * esperar por uma publicação.
 */
const CHECKOUT = 'https://pay.hotmart.com/R107579814L?off=b1uzq2p7';

/**
 * Quanto custa.
 *
 * Não tem valor por omissão, e isso é de propósito. Esta app já teve «49 €»
 * escrito à mão, de uma altura em que quem cobrava era outra plataforma e o
 * preço era outro. Um número desses ao lado de um botão que cobra coisa
 * diferente é a pior avaria que uma página de vendas pode ter: a pessoa paga
 * a pensar que combinou uma coisa e recebe a fatura de outra.
 *
 * Por isso: ou o preço vem do ambiente, posto por quem o sabe, ou não se
 * mostra número nenhum e deixa-se o checkout dizê-lo. Uma página sem preço
 * vende pior; uma página com o preço errado gera devoluções e queixas.
 */
export function precos(): Preco[] {
  return [
    {
      valor: process.env.HOTMART_PRECO?.trim() || null,
      moeda: 'EUR',
      link: process.env.HOTMART_LINK?.trim() || CHECKOUT,
      nota: 'por mês',
    },
    {
      valor: process.env.HOTMART_PRECO_BRL?.trim() || null,
      moeda: 'BRL',
      link: process.env.HOTMART_LINK_BRL?.trim() || null,
      nota: 'por mês',
    },
  ];
}

/** O que vem com a assinatura. É a mesma lista na página de vendas e na de renovação. */
export const INCLUI = [
  'A Fábrica de carrosséis: colas um documento, saem os slides',
  'O Editor, para afinar cada slide à mão',
  'A Cát.IA a escrever contigo — carrosséis, roteiros, legendas',
  'A Última hora: o que está a acontecer, virado em conteúdo teu',
  'A Análise de perfil e a Memória, que aprende a tua voz',
  'Exportar em 4K, um a um ou tudo num zip',
];

/** Quantas fotografias e templates cabem. */
export const GUARDA = ['10 fotografias', '5 templates', 'estilos sem limite'];

/** O tecto, dito por palavras. O número vive em creditos.ts. */
export const TECTO = `${TECTO_CREDITOS} créditos por mês — dá para cerca de ${Math.floor(
  TECTO_CREDITOS / 3,
)} carrosséis escritos de raiz`;

/** Há para onde mandar quem quer pagar? */
export function haOndePagar(lista: Preco[]) {
  return lista.some((p) => p.link);
}
