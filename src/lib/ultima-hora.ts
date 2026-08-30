import Anthropic from '@anthropic-ai/sdk';
import { chaveClaude } from './claude';
import { REGIOES, type Regiao } from './regioes';

/**
 * Última hora.
 *
 * A diferença para as "pautas" das outras apps é deliberada: elas trazem as
 * tendências do país inteiro — futebol, celebridades, política — e isso, para
 * quem vende serviços, é audiência que nunca compra. Aqui procura-se o que
 * está a mexer NO NICHO dela, e cada assunto vem já convertido em dois
 * ângulos prontos a escrever.
 */

export type { Regiao };
export { REGIOES };

export interface Angulo {
  tipo: 'historia' | 'lista';
  titulo: string;
  gancho: string;
}

export interface Assunto {
  categoria: string;
  assunto: string;
  fonte: string;
  url?: string;
  porque: string;
  angulos: Angulo[];
}

const MODELO = 'claude-opus-5';

export async function procurarAssuntos(args: {
  briefingTexto: string;
  nicho: string;
  regiao: Regiao;
  quantos: number;
  /** 'nicho' — o que mexe no mundo dela. 'quentes' — o que mexe no mundo. */
  modo?: 'nicho' | 'quentes';
  /** Até cinco referências dela, separadas por vírgulas, quando quer procurar algo em concreto. */
  palavras?: string | null;
}): Promise<Assunto[]> {
  const regiao = REGIOES.find((r) => r.id === args.regiao) ?? REGIOES[0];
  const quentes = args.modo === 'quentes';
  const referencias = (args.palavras ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 5);
  const palavras = referencias.join(' · ');
  const apiKey = chaveClaude();
  if (!apiKey) throw new Error('A Última hora precisa da chave da Anthropic.');
  const client = new Anthropic({ apiKey });

  const resposta = await client.messages.create({
    model: MODELO,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    tools: [
      {
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: 8,
        ...(regiao.pais
          ? { user_location: { type: 'approximate', country: regiao.pais } }
          : {}),
      } as never,
    ],
    system: [
      {
        type: 'text',
        text: `És a Cát.IA, a assistente de conteúdo desta criadora.

Quem ela é:
${args.briefingTexto.slice(0, 6000)}

Isto que acabaste de ler serve para escreveres os ÂNGULOS: a voz, o público, o
que interessa a quem a segue. NÃO serve para escolher as notícias — o que
procurar está dito a seguir, e é só isso.`,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `${
          referencias.length
            ? `Procura na internet notícias sobre isto: ${referencias
                .map((r) => `"${r}"`)
                .join(', ')}.

Vale o que tenha saído nos últimos TRINTA DIAS — não tem de ser de hoje, mas
tem de ser deste mês e não de arquivo. Dentro de cada assunto, traz o que foi
maior e mais falado. Se uma das referências não der nada, deixa-a de fora em
vez de inventar.

Onde procurar: ${regiao.onde}.`
            : quentes
              ? `Procura na internet as MAIORES notícias do momento — as que estão
mesmo a dar que falar nas últimas 48 horas.

Onde procurar: ${regiao.onde}.

QUALQUER tema serve, e é isso que se quer: política, saúde, economia, clima,
justiça, ciência, tecnologia, desporto, cultura, celebridades, sociedade,
educação, trabalho. As notícias das aberturas dos jornais e das conversas de
café.

NÃO restrinjas a busca ao nicho dela. Não vás procurar notícias de Instagram,
de redes sociais nem de inteligência artificial só porque é disso que ela fala
— isso é o que ela já sabe de cor. O que ela quer é a atualidade, para a moldar
ao mundo dela.

A ponte com o mundo dela faz-se no ÂNGULO, não na escolha da notícia. Quase
tudo dá: uma decisão política vira uma lição de comunicação; um caso de saúde
pública vira o custo de adiar; um resultado desportivo vira o que se aprende com
quem perdeu bem. Traz a notícia grande e trata tu de encontrar a ponte.`
              : `Procura na internet o que está a dar que falar AGORA — últimos sete
dias — dentro do nicho dela: ${args.nicho}.

Onde procurar: ${regiao.onde}.

Procura coisas como: mudanças no Instagram e no algoritmo, novidades de
ferramentas de IA para criar conteúdo, dados e estudos novos sobre alcance e
formatos, polémicas do mundo da criação de conteúdo, mudanças no que funciona
em Reels e carrosséis.

Aqui sim, só o nicho: nada de futebol, celebridades ou política. Se não
encontrares nada relevante, traz menos assuntos em vez de encher.`
        }

Devolve exatamente ${args.quantos} assuntos, em JSON e nada mais:

[
  {
    "categoria": ${
      quentes
        ? '"Mundo" | "Política" | "Saúde" | "Economia" | "Clima" | "Ciência" | "Tecnologia" | "Desporto" | "Cultura" | "Sociedade"'
        : '"Plataformas" | "Ferramentas" | "Estratégia" | "Dados" | "Polémica"'
    },
    "assunto": "o assunto em cinco palavras",
    "fonte": "onde viste (nome do site)",
    "url": "o endereço",
    "porque": ${
      quentes
        ? '"duas ou três frases: o que aconteceu, e a ponte — o que é que isto diz a quem a segue"'
        : '"duas ou três frases: o que aconteceu e porque interessa a quem cria conteúdo"'
    },
    "angulos": [
      {
        "tipo": "historia",
        "titulo": "o título do carrossel — o bastidor, o porquê, o que ninguém contou",
        "gancho": "a frase da capa, pronta a publicar"
      },
      {
        "tipo": "lista",
        "titulo": "o título do carrossel em lista numerada — 5 erros, 5 mudanças, 5 formas",
        "gancho": "a frase da capa, pronta a publicar"
      }
    ]
  }
]

Os ganchos escrevem-se em português de Portugal, tratamento por tu, no método
dela: quebra de expectativa, dor silenciosa, bastidores ou recompensa
imediata. Nada de "guia definitivo" nem "segredo revelado".`,
      },
    ],
  });

  const texto = resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  const inicio = texto.indexOf('[');
  const fim = texto.lastIndexOf(']');
  if (inicio === -1 || fim === -1) {
    throw new Error('Não consegui ler os assuntos que ela encontrou.');
  }

  return JSON.parse(texto.slice(inicio, fim + 1)) as Assunto[];
}
