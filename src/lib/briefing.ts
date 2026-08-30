/**
 * O briefing: quatro separadores, vinte campos.
 * É daqui que sai o texto que a Cát.IA lê antes de escrever seja o que for —
 * a estrutura obriga a responder ao que interessa, em vez de um texto solto.
 */

export type IdSeparador = 'nicho' | 'publico' | 'posicionamento' | 'autoridade';

export interface Campo {
  id: string;
  pergunta: string;
  ajuda?: string;
  tipo: 'texto' | 'area' | 'escolha';
  opcoes?: string[];
  /** caixa de "não tenho", para campos que podem legitimamente ficar vazios */
  semResposta?: string;
}

export interface Separador {
  id: IdSeparador;
  titulo: string;
  cor: string;
  fundo: string;
  campos: Campo[];
}

export const SEPARADORES: Separador[] = [
  {
    id: 'nicho',
    titulo: 'Nicho',
    cor: 'text-[#8B5CF6]',
    fundo: 'bg-[#F3EDFF] border-[#E4D9FF]',
    campos: [
      { id: 'instagram', pergunta: 'Qual o seu @ no Instagram?', tipo: 'texto' },
      { id: 'genero', pergunta: 'Você é:', tipo: 'escolha', opcoes: ['Homem', 'Mulher'] },
      {
        id: 'pais',
        pergunta: 'De que país fala?',
        ajuda: 'é por aqui que a Última hora começa a procurar',
        tipo: 'escolha',
        opcoes: ['Portugal', 'Brasil', 'Espanha', 'Outro'],
      },
      {
        id: 'nicho',
        pergunta: 'Qual o seu nicho?',
        ajuda: 'ex.: Marketing Digital',
        tipo: 'texto',
      },
      {
        id: 'subnicho',
        pergunta: 'Qual o seu subnicho? Temas de que fala?',
        ajuda: 'ex.: tráfego pago, copy, funis',
        tipo: 'area',
      },
      {
        id: 'adicional',
        pergunta: 'Informações adicionais sobre si',
        tipo: 'area',
        semResposta: 'Não tenho informação adicional',
      },
    ],
  },
  {
    id: 'publico',
    titulo: 'Público',
    cor: 'text-[#16A34A]',
    fundo: 'bg-[#EDFBF1] border-[#D6F2DF]',
    campos: [
      { id: 'cliente_ideal', pergunta: 'Descreva o seu cliente ideal', tipo: 'area' },
      { id: 'frustracoes', pergunta: 'O que eles odeiam / o que os frustra?', tipo: 'area' },
      { id: 'desejos', pergunta: 'O que eles amam / querem alcançar?', tipo: 'area' },
      { id: 'objecoes', pergunta: 'Quais as suas maiores objeções de venda?', tipo: 'area' },
      { id: 'quem_compra', pergunta: 'Quem mais compra os seus produtos?', tipo: 'area' },
    ],
  },
  {
    id: 'posicionamento',
    titulo: 'Posicionamento',
    cor: 'text-[#EA7A3C]',
    fundo: 'bg-[#FFF3EA] border-[#FFE3CE]',
    campos: [
      { id: 'historia', pergunta: 'Como começou a fazer o que faz?', ajuda: 'a tua história', tipo: 'area' },
      { id: 'defende', pergunta: 'O que defende no seu nicho?', tipo: 'area' },
      { id: 'valores', pergunta: 'Os seus valores (vida e trabalho)', tipo: 'area' },
      { id: 'tom', pergunta: 'Tom de voz e comunicação', tipo: 'area' },
      { id: 'evita', pergunta: 'Assuntos ou termos que evita falar', tipo: 'area' },
    ],
  },
  {
    id: 'autoridade',
    titulo: 'Autoridade',
    cor: 'text-rosa',
    fundo: 'bg-rosaSuave border-rosa/25',
    campos: [
      { id: 'resultado', pergunta: 'Que resultado gera para o seu cliente?', tipo: 'area' },
      { id: 'diferente', pergunta: 'Porque é diferente?', tipo: 'area' },
      {
        id: 'produtos',
        pergunta: 'Produtos e preços',
        tipo: 'area',
        semResposta: 'Não tenho produto ainda',
      },
      { id: 'promessas', pergunta: 'Promessas de cada produto', tipo: 'area' },
      { id: 'concorrentes', pergunta: 'Maiores concorrentes (URLs)', tipo: 'area' },
    ],
  },
];

export type Briefing = Record<string, string>;

export const TODOS_OS_CAMPOS = SEPARADORES.flatMap((s) =>
  s.campos.map((c) => ({ ...c, separador: s.titulo })),
);

/** Quantos campos estão respondidos. */
export function preenchimento(b: Briefing) {
  const feitos = TODOS_OS_CAMPOS.filter((c) => (b[c.id] ?? '').trim()).length;
  return { feitos, total: TODOS_OS_CAMPOS.length };
}

/**
 * O briefing em texto corrido — é isto que segue para a IA.
 * Mantém-se o formato de perguntas e respostas para o modelo perceber o que
 * é cada coisa sem ter de adivinhar.
 */
export function briefingParaTexto(b: Briefing): string {
  const partes: string[] = [];
  for (const sep of SEPARADORES) {
    const respostas = sep.campos
      .filter((c) => (b[c.id] ?? '').trim())
      .map((c) => `${c.pergunta}\n${b[c.id].trim()}`);
    if (respostas.length) partes.push(`## ${sep.titulo.toUpperCase()}\n\n${respostas.join('\n\n')}`);
  }
  return partes.join('\n\n');
}
