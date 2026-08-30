import { CATALOGO, COMPORTAMENTO, METODO_CATIA, PERSONA_CATIA } from './metodo-catia';
import { AGENTE_CARROSSEL, ANTI_CLONE, ECOSSISTEMA } from './agente-carrossel';
import type { TemplateSpec } from './types';

export const DEFAULT_BRAND_VOICE = `
Escreves em português de Portugal, para Instagram.
Voz: próxima, direta, sem jargão nem tom de manual. Frases curtas.
Falas como quem explica a uma amiga que não percebe nada do tema.
Nada de "descubra", "alavancar", "potencializar", "nesse sentido".
Nada de emojis. Nada de aspas decorativas.
Autoridade sem esforço de a provar: mostras, não anuncias.
`.trim();

/** Sistema para escrever um carrossel completo. */
/** O documento mestre, se existir, entra antes de tudo o resto. */
function blocoPerfil(perfil?: string | null) {
  const texto = perfil?.trim();
  if (!texto) return '';
  return `
─── QUEM ESCREVE ───
O que se segue foi escrito pela própria criadora sobre si, o seu público e os
seus objetivos. É a fonte de verdade: escreve para este público, com esta voz,
ao serviço destes objetivos. Não inventes factos que não estejam aqui.

${texto}
─── fim ───
`;
}

export function carouselSystemPrompt(brandVoice: string | null, perfil?: string | null) {
  return `${AGENTE_CARROSSEL}

${METODO_CATIA}

Escreves para uma criadora portuguesa de Instagram — em português de Portugal,
tratamento por tu.

${blocoPerfil(perfil)}
${brandVoice?.trim() || DEFAULT_BRAND_VOICE}

Regras de estrutura:
- Slide 1 é o gancho. Uma promessa, uma tensão ou um erro comum. Curto e concreto.
- Slides do meio: uma ideia por slide. Nunca dois assuntos no mesmo slide.
- Último slide: chamada à ação clara e humana (comentar uma palavra, guardar, seguir).
- Nunca repetir a mesma construção de frase em dois slides seguidos.
- Respeitar rigorosamente os limites de caracteres de cada campo.
  Um campo que estoura o limite estraga o design — corta em vez de encher.
- Se um campo não fizer sentido num slide, devolve string vazia.

Três coisas que nunca se fazem, aconteça o que acontecer:
- Nunca inventar números, percentagens, estudos ou fontes. Um "81% dos
  criadores" que não veio de lado nenhum é a credibilidade dela a pagar.
  Sem o número verdadeiro, escreve-se a ideia sem número.
- Nunca escrever na primeira pessoa uma experiência que não se sabe se ela
  viveu ("o que eu aprendi com isto", "quando me aconteceu"). O que ela viveu
  é ela que conta.
- Nunca um slide de ligação, daqueles que existem só para colar um assunto ao
  outro e não dizem nada. Se um slide não tem ideia própria, não existe.

Legenda: 3 a 6 linhas, primeira linha é gancho, última é a chamada à ação.
Hashtags: 8 a 12, minúsculas, sem repetir palavras do texto, separadas por espaço.
`.trim();
}

/** Descreve os campos do template para a IA saber o que preencher. */
export function describeTemplate(spec: TemplateSpec, slidesPer: number) {
  // as caixas de texto fixo (a @, uma assinatura) não são para escrever
  const boxes = spec.boxes
    .filter((b) => !b.fixed)
    .map((b) => {
      const scope =
        b.scope === 'first'
          ? 'só no primeiro slide'
          : b.scope === 'last'
            ? 'só no último slide'
            : b.scope === 'middle'
              ? 'só nos slides do meio'
              : 'em todos os slides';
      return `- "${b.key}" (${b.label}) — ${scope}, máximo ${b.maxChars ?? 120} caracteres`;
    })
    .join('\n');

  return `
O carrossel tem exatamente ${slidesPer} slides.
Cada slide preenche estes campos:
${boxes}
`.trim();
}

/** Prompt de conteúdo a partir de material de origem. */
export function carouselUserPrompt(opts: {
  topic?: string | null;
  sourceText?: string | null;
  spec: TemplateSpec;
  slidesPer: number;
  extra?: string | null;
}) {
  const { topic, sourceText, spec, slidesPer, extra } = opts;
  const parts: string[] = [];

  if (topic) parts.push(`Tema do carrossel: ${topic}`);
  if (sourceText) {
    parts.push(
      `Material de origem (usa só o que for útil, não copies frases inteiras):\n"""\n${sourceText.slice(0, 12000)}\n"""`,
    );
  }
  if (extra) parts.push(`Instruções adicionais: ${extra}`);
  parts.push(describeTemplate(spec, slidesPer));

  parts.push(
    `
ESCREVE O CARROSSEL COMPLETO. Não é um esboço nem uma lista de tópicos — é o
texto final, pronto a publicar tal como está.

Slide 1 — a capa. Só o gancho, e nada mais. É a promessa que faz parar o scroll.
Um dos quatro tipos: quebra de expectativa, dor silenciosa, bastidores, ou
recompensa imediata. Nunca um título de manual ("Dicas para…", "Como fazer…").

Slides do meio — uma ideia por slide, desenvolvida. Cada um tem de ter a frase
que resume a ideia E o texto que a explica: o que é, porque acontece, o que
fazer. Um slide com três palavras soltas não serve. Sem "hoje vou falar sobre",
sem introduções, sem repetir o que o slide anterior já disse. Se puderes dar um
número, um exemplo concreto ou um erro comum, dá.

Último slide — o comando. Guardar, seguir, ou uma palavra no direct. Tem de
cumprir o que a capa prometeu.

REGRAS DE PREENCHIMENTO
· Preenche TODOS os campos de TODOS os slides em que esse campo aparece. Um
  campo vazio é um slide por acabar.
· Respeita os limites de caracteres — o texto é composto numa imagem e o que
  passar do limite é cortado. Escreve dentro do espaço, não escrevas menos por
  precaução.
· Português de Portugal, tratamento por tu.

A LEGENDA
Escreve-a por inteiro, entre 120 e 180 palavras, pelo Problema · Agitação ·
Solução. A primeira linha vende o clique para a segunda — só duas aparecem antes
do "…mais". Parágrafos curtos. Acaba com um comando.

Em "hashtags", cinco, separadas por espaços, específicas do nicho — nada de
#instagram #viral #explore.

Em "title", um nome curto para identificares o carrossel na app.
Em "topic", o tema numa linha.
`.trim(),
  );

  return parts.join('\n\n');
}

/** JSON Schema para a resposta estruturada. */
export function carouselSchema(fieldKeys: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'topic', 'caption', 'hashtags', 'slides'],
    properties: {
      title: { type: 'string', description: 'Título interno curto do carrossel' },
      topic: { type: 'string' },
      caption: { type: 'string' },
      hashtags: { type: 'string' },
      slides: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['idx', 'fields'],
          properties: {
            idx: { type: 'integer' },
            fields: {
              type: 'object',
              additionalProperties: false,
              required: fieldKeys,
              properties: Object.fromEntries(
                fieldKeys.map((k) => [k, { type: 'string' }]),
              ),
            },
          },
        },
      },
    },
  } as const;
}

/** Sistema do chat lateral. */
export function chatSystemPrompt(brandVoice: string | null, perfil?: string | null) {
  return `
${PERSONA_CATIA}

${METODO_CATIA}

${COMPORTAMENTO}

${ECOSSISTEMA}

${ANTI_CLONE}

${CATALOGO}

${blocoPerfil(perfil)}
${brandVoice?.trim() || DEFAULT_BRAND_VOICE}

As fotografias não se geram aqui: a criadora traz as dela e carrega-as em
Fotografias. Se fizer sentido sugerir uma imagem, descreve-a por palavras.
`.trim();
}
