/**
 * Os créditos: o que se gasta, e quanto.
 *
 * Antes havia um tecto de "pedidos", e um pedido era um pedido — escrever um
 * carrossel inteiro contava o mesmo que mandar uma frase ao Agente. Não era
 * verdade e não se percebia: ninguém consegue planear o mês sem saber quanto
 * custa cada coisa.
 *
 * Agora cada coisa tem um preço, e o preço acompanha o trabalho que ela dá à
 * IA — quantas vezes se fala com ela, e quão grande é o que entra e sai. Os
 * números são redondos de propósito: isto é para ser contado de cabeça, não
 * para ser exato ao cêntimo.
 *
 * O tecto é por pessoa e por mês, e volta a zero no dia 1.
 *
 * Não é preciso migração nenhuma para isto: a função `marcar_consumo` já
 * recebia um número de unidades (era para os lotes), e é esse número que
 * passa a levar o custo em créditos.
 */

/** O nome com que cada gasto fica registado, para depois se ver onde foi. */
export type Acao =
  | 'carrossel'
  | 'roteiro'
  | 'conversa'
  | 'ultima-hora'
  | 'ganchos'
  | 'perfil'
  | 'separar'
  | 'ler';

/** Quantos créditos cada pessoa tem por mês. */
export const TECTO_CREDITOS = 250;

/**
 * Quanto custa cada coisa.
 *
 * A escala vem do trabalho real de cada rota — o número de chamadas à IA e o
 * tamanho do que entra e sai:
 *
 *   1  uma resposta curta, uma chamada pequena
 *   2  uma chamada com muito texto a entrar, ou três pequenas
 *   3  um carrossel inteiro escrito do princípio ao fim
 *  10  a análise de perfil, que é a coisa mais pesada que a app faz
 */
export const CUSTOS: Record<Acao, number> = {
  conversa: 1,
  ganchos: 2,
  separar: 2,
  carrossel: 3,
  roteiro: 3,
  'ultima-hora': 3,
  ler: 3,
  perfil: 10,
};

export interface LinhaDoPreco {
  acao: Acao;
  /** como se chama no ecrã */
  nome: string;
  /** onde é que isto acontece */
  onde: string;
  custo: number;
  /** o que se percebe melhor dito por extenso */
  nota?: string;
}

/**
 * A tabela como ela aparece na app.
 *
 * Está por ordem de preço e não por ordem de menu, porque quem a lê está a
 * perguntar "o que é que me come os créditos", e a resposta é de baixo para
 * cima.
 */
export const TABELA: LinhaDoPreco[] = [
  {
    acao: 'conversa',
    nome: 'Uma resposta do teu agente',
    onde: 'Agente Cát.IA',
    custo: CUSTOS.conversa,
    nota: 'Cada vez que ele te responde. A conversa toda não conta — conta cada resposta.',
  },
  {
    acao: 'ganchos',
    nome: 'Nove ganchos',
    onde: 'dentro do Agente',
    custo: CUSTOS.ganchos,
    nota: 'Saem nove de uma vez, e custam dois no total.',
  },
  {
    acao: 'separar',
    nome: 'Separar os carrosséis de um documento',
    onde: 'Fábrica de carrosséis',
    custo: CUSTOS.separar,
    nota: 'Só quando o leitor não acerta sozinho e pede ajuda à Cát.IA. Na maioria dos documentos não chega a acontecer.',
  },
  {
    acao: 'carrossel',
    nome: 'Um carrossel escrito de raiz',
    onde: 'Criar',
    custo: CUSTOS.carrossel,
    nota: 'Um lote de dez carrosséis custa dez vezes isto.',
  },
  {
    acao: 'roteiro',
    nome: 'Um roteiro de Reels ou Stories',
    onde: 'Criar',
    custo: CUSTOS.roteiro,
  },
  {
    acao: 'ultima-hora',
    nome: 'Uma notícia virada em conteúdo',
    onde: 'Última hora',
    custo: CUSTOS['ultima-hora'],
  },
  {
    acao: 'ler',
    nome: 'Um documento transformado em carrosséis',
    onde: 'Criar, a partir de um ficheiro',
    custo: CUSTOS.ler,
    nota: 'Por carrossel que sair de lá. Um documento que dá cinco carrosséis custa cinco vezes isto.',
  },
  {
    acao: 'perfil',
    nome: 'Uma análise de perfil',
    onde: 'Análise de perfil',
    custo: CUSTOS.perfil,
    nota: 'É a coisa mais pesada que a app faz — lê o perfil todo e devolve um plano de trinta dias.',
  },
];

/**
 * O que 250 créditos dão, dito de maneiras diferentes.
 *
 * É esta a pergunta que uma pessoa faz quando vê um número: "isto dá para
 * quê?". Uma barra de progresso não responde; isto responde.
 */
export const DA_PARA: Array<{ quantos: number; o_que: string }> = [
  { quantos: Math.floor(TECTO_CREDITOS / CUSTOS.carrossel), o_que: 'carrosséis escritos de raiz' },
  { quantos: Math.floor(TECTO_CREDITOS / CUSTOS.conversa), o_que: 'respostas do teu agente' },
  {
    quantos: Math.floor(TECTO_CREDITOS / CUSTOS['ultima-hora']),
    o_que: 'notícias viradas em conteúdo',
  },
  { quantos: Math.floor(TECTO_CREDITOS / CUSTOS.perfil), o_que: 'análises de perfil' },
];

/** Quanto custa isto, vezes quantas vezes se faz. */
export function custo(acao: Acao, quantas = 1): number {
  return (CUSTOS[acao] ?? 1) * Math.max(1, quantas);
}

/** O que não gasta crédito nenhum, dito por palavras para a app poder mostrá-lo. */
export const DE_GRACA = [
  'A Fábrica de carrosséis, quando o documento já vem escrito em slides',
  'O Editor, e exportar em 4K',
  'A Biblioteca: estilos, templates, fotografias e materiais',
  'Ler as conversas antigas e a Memória',
];
