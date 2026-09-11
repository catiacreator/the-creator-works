/**
 * O preço, e para onde se vai pagar.
 *
 * Os links de pagamento são feitos no painel do Stripe e postos no ambiente —
 * não há aqui chave nenhuma, só endereços públicos, que é o que um link de
 * pagamento é. Sem eles as páginas dizem-se por configurar em vez de mandarem
 * alguém para lado nenhum.
 *
 * São lidos do lado do servidor, a cada pedido, e não com o prefixo
 * NEXT_PUBLIC. Se levassem esse prefixo ficavam cozidos dentro do JavaScript
 * na altura da compilação, e trocar um link obrigava a publicar a app outra
 * vez. Assim troca-se no painel da Vercel e vale no pedido seguinte.
 */

export interface Preco {
  /** o que se mostra */
  valor: string;
  moeda: string;
  /** para onde vai o botão */
  link: string | null;
  nota: string;
}

/** Só corre no servidor. */
export function precos(): Preco[] {
  return [
    {
      valor: '49 €',
      moeda: 'EUR',
      link: process.env.STRIPE_LINK_EUR?.trim() || null,
      nota: 'por mês, IVA incluído',
    },
    {
      valor: 'R$ 297',
      moeda: 'BRL',
      link: process.env.STRIPE_LINK_BRL?.trim() || null,
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

/** O tecto de pedidos à Cát.IA, dito por palavras. */
export const TECTO = '200 pedidos à Cát.IA por mês';

/** Há para onde mandar quem quer pagar? */
export function haOndePagar(lista: Preco[]) {
  return lista.some((p) => p.link);
}
