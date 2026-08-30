import Anthropic from '@anthropic-ai/sdk';
import type { CarouselContent, TemplateSpec } from './types';
import { carouselSystemPrompt, carouselUserPrompt } from './prompts';

/**
 * O caminho da Anthropic — o SDK oficial, a falar com a Messages API.
 * Vive à parte do cliente da OpenAI de propósito: são duas APIs diferentes,
 * e misturá-las num ficheiro só dá confusão a quem lá voltar.
 */

const MODELO = 'claude-opus-5';
/** Para o que é curto e tem de sair já — não vale a pena acordar o Opus. */
const MODELO_RAPIDO = 'claude-sonnet-5';

/** A chave vive no ambiente (ANTHROPIC_API_KEY), não na base de dados. */
export function chaveClaude(): string | null {
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

export function temClaude(): boolean {
  return Boolean(chaveClaude());
}

function cliente() {
  const apiKey = chaveClaude();
  if (!apiKey) throw new Error('Sem chave da Anthropic. Põe a ANTHROPIC_API_KEY no .env.local.');
  return new Anthropic({ apiKey });
}

export interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
}

/** Uma volta de conversa. Devolve o texto da resposta. */
export async function conversaClaude(args: {
  system: string;
  historico: Mensagem[];
  extraSystem?: string | null;
}): Promise<string> {
  const client = cliente();

  const system: Anthropic.TextBlockParam[] = [
    // o prompt do método é sempre igual — fica em cache e sai mais barato
    { type: 'text', text: args.system, cache_control: { type: 'ephemeral' } },
  ];
  if (args.extraSystem?.trim()) {
    system.push({ type: 'text', text: args.extraSystem });
  }

  const resposta = await client.messages.create({
    model: MODELO,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system,
    messages: args.historico.map((m) => ({ role: m.role, content: m.content })),
  });

  if (resposta.stop_reason === 'refusal') {
    throw new Error('O modelo recusou responder a este pedido.');
  }

  return resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

/**
 * Uma resposta curta, o mais depressa possível.
 *
 * Sem pensamento estendido e com o sistema reduzido ao essencial — é o que
 * faz a diferença entre esperar dois minutos e esperar alguns segundos.
 */
export async function rapidoClaude(args: {
  system: string;
  pedido: string;
  maxTokens?: number;
}): Promise<string> {
  const client = cliente();

  const resposta = await client.messages.create({
    model: MODELO_RAPIDO,
    max_tokens: args.maxTokens ?? 1500,
    // sem isto o modelo gasta o orçamento todo a pensar e devolve texto
    // vazio — para nove frases curtas não há nada para pensar
    thinking: { type: 'disabled' },
    system: [{ type: 'text', text: args.system }],
    messages: [{ role: 'user', content: args.pedido }],
  });

  if (resposta.stop_reason === 'refusal') {
    throw new Error('O modelo recusou responder a este pedido.');
  }

  return resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

/** Escreve o carrossel completo e devolve-o já em objeto. */
export async function escreverCarrosselClaude(args: {
  settings: { brand_voice: string | null; perfil: string | null };
  spec: TemplateSpec;
  slidesPer: number;
  topic?: string | null;
  sourceText?: string | null;
  extra?: string | null;
  /** O que ela carregou em Material, já filtrado pelo que interessa a este tema. */
  material?: string | null;
}): Promise<CarouselContent> {
  const { settings, spec, slidesPer, topic, sourceText, extra, material } = args;
  const client = cliente();
  const fieldKeys = spec.boxes.map((b) => b.key);

  const resposta = await client.messages.create({
    model: MODELO,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: carouselSystemPrompt(settings.brand_voice, settings.perfil),
        cache_control: { type: 'ephemeral' },
      },
      // o material muda de tema para tema, por isso fica fora da cache
      ...(material?.trim() ? [{ type: 'text' as const, text: material }] : []),
    ],
    messages: [
      {
        role: 'user',
        content: `${carouselUserPrompt({ topic, sourceText, spec, slidesPer, extra })}

Responde só com este objeto JSON, sem texto à volta e sem blocos de código:
{
  "title": "…",
  "topic": "…",
  "caption": "…",
  "hashtags": "…",
  "slides": [
    { "fields": { ${fieldKeys.map((k) => `"${k}": "…"`).join(', ')} } }
  ]
}
Exatamente ${slidesPer} slides.`,
      },
    ],
  });

  if (resposta.stop_reason === 'refusal') {
    throw new Error('O modelo recusou escrever este carrossel.');
  }

  const bruto = resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  const limpo = bruto
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed: CarouselContent;
  try {
    parsed = JSON.parse(limpo) as CarouselContent;
  } catch {
    // às vezes vem uma frase antes do objeto — apanha o primeiro { … } completo
    const inicio = limpo.indexOf('{');
    const fim = limpo.lastIndexOf('}');
    if (inicio === -1 || fim === -1) throw new Error('O modelo não devolveu JSON.');
    parsed = JSON.parse(limpo.slice(inicio, fim + 1)) as CarouselContent;
  }

  parsed.slides = (parsed.slides ?? [])
    .slice(0, slidesPer)
    .map((s, i) => ({ idx: i, fields: s.fields ?? {} }));
  while (parsed.slides.length < slidesPer) {
    parsed.slides.push({
      idx: parsed.slides.length,
      fields: Object.fromEntries(fieldKeys.map((k) => [k, ''])),
    });
  }

  return parsed;
}
