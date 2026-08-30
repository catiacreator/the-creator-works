/**
 * A fábrica de ganchos.
 *
 * Nove ganchos para o mesmo assunto, cada um por uma tipologia diferente —
 * porque o gancho é a única coisa que decide se o carrossel é lido. As
 * tipologias são fixas de propósito: obrigam a sair do primeiro gancho óbvio.
 */

export interface Tipologia {
  id: string;
  nome: string;
  como: string;
}

export const TIPOLOGIAS: Tipologia[] = [
  {
    id: 'consequencia',
    nome: 'Consequência temporal',
    como: 'O que acontece a quem continua a fazer isto — daqui a semanas ou meses.',
  },
  {
    id: 'geracao',
    nome: 'Epidemia / geração',
    como: 'Nomeia um grupo inteiro que já vive assim, como quem descreve um fenómeno.',
  },
  {
    id: 'inimigo',
    nome: 'Personificação do inimigo',
    como: 'Dá vontade própria ao algoritmo, ao mercado ou ao hábito. "O algoritmo detesta quem…"',
  },
  {
    id: 'alerta',
    nome: 'Alerta e guardar',
    como: 'Isto é um aviso para quem ainda acha que… — cria urgência sem gritar.',
  },
  {
    id: 'polarizacao',
    nome: 'Polarização visual',
    como: 'Duas imagens da mesma pessoa, separadas pelo tempo ou pela escolha. "Este é… este é o mesmo, oito meses depois."',
  },
  {
    id: 'condicional',
    nome: 'Condicional',
    como: 'Se fazes X e sentes Y, este carrossel é para ti. Filtra quem interessa.',
  },
  {
    id: 'negligencia',
    nome: 'Negligência profissional',
    como: 'O lado que os cursos, os gurus ou o mercado ignoram de propósito.',
  },
  {
    id: 'sabotagem',
    nome: 'Sabotagem invisível',
    como: 'O que parece prova de sucesso e está a destruir alguma coisa por dentro.',
  },
  {
    id: 'dor',
    nome: 'Dor silenciosa',
    como: 'Algo que a pessoa sente há muito tempo e nunca pôs em palavras.',
  },
];

export interface Gancho {
  tipologia: string;
  gancho: string;
}

/**
 * O sistema mínimo para escrever ganchos.
 * De propósito não leva o método todo nem o catálogo da app: para nove frases
 * curtas, cada linha a mais é tempo que ela passa a olhar para o ecrã.
 */
export function sistemaDosGanchos(brandVoice: string | null, perfil?: string | null) {
  return `
És a Cát.IA, a parceira de escrita de uma criadora portuguesa de Instagram.
Escreves ganchos de capa — a frase que decide se o carrossel é lido.

${brandVoice?.trim() || 'Português de Portugal, tratamento por tu. Frases curtas, sem jargão, sem emojis.'}
${perfil?.trim() ? `\nQuem escreve, e para quem:\n${perfil.trim().slice(0, 1500)}` : ''}

Um bom gancho é uma destas quatro coisas: quebra de expectativa, dor
silenciosa, bastidor, ou recompensa imediata. Nunca um título de manual.
`.trim();
}

export function promptDosGanchos(args: {
  assunto: string;
  contexto?: string | null;
  angulo?: string | null;
  /** Só estas tipologias. Serve para partir o pedido em três e correr tudo ao mesmo tempo. */
  tipologias?: Tipologia[];
}) {
  const lista = args.tipologias ?? TIPOLOGIAS;
  return `
Escreve ${lista.length} ganchos de capa para um carrossel sobre isto:

ASSUNTO: ${args.assunto}
${args.contexto ? `CONTEXTO: ${args.contexto}` : ''}
${args.angulo ? `ÂNGULO: ${args.angulo}` : ''}

Um gancho por tipologia, por esta ordem:
${lista.map((t, i) => `${i + 1}. ${t.nome} — ${t.como}`).join('\n')}

Regras:
· O gancho vira o assunto para o mundo de quem te lê. Se o assunto for
  notícia de outra gente, o gancho tem de falar da vida dela, não da notícia.
· Uma frase. Sem dois pontos a separar título e subtítulo. Sem "guia",
  "segredo", "fórmula", "descubra".
· Concreto: uma situação que se reconhece, não uma abstração.
· Nada de percentagens nem estatísticas — nunca. Um número que não venha de
  uma fonte real é uma mentira com a cara dela em cima.
· Português de Portugal, tratamento por tu.

Responde só com o JSON, sem uma palavra à volta:
[{ "tipologia": "Consequência temporal", "gancho": "…" }]
`.trim();
}

/**
 * As regras que o corpo do carrossel tem de cumprir quando nasce de um gancho
 * escolhido. É aqui que se corrige o erro clássico: o gancho decorar a capa e
 * o corpo falar de outra coisa qualquer.
 */
export function regrasDoGancho(gancho: string, instrucao?: string | null) {
  return `
O GANCHO ESCOLHIDO É ESTE, e manda em tudo:
"${gancho}"

· A capa é o gancho, tal e qual, sem o reescrever.
· TODOS os slides seguintes desenvolvem ESTE gancho. Se o material de origem
  falar de outra coisa, é o material que se deita fora, não o gancho.
· Cada slide entre 15 e 25 palavras. Um slide com 60 palavras não se lê no
  feed — perde-se ali o carrossel inteiro.
· PROIBIDO inventar números, percentagens, estudos ou fontes. Se não tens o
  número verdadeiro, escreve a ideia sem número.
· PROIBIDO escrever na primeira pessoa experiências que não sabes se ela viveu
  ("o que eu aprendi com isto", "quando me aconteceu"). Ela é que decide o que
  contou.
· O último slide cumpre o que o gancho prometeu.
${instrucao?.trim() ? `\n· E ainda: ${instrucao.trim()}` : ''}
`.trim();
}
