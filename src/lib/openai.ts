import OpenAI from 'openai';
import { decrypt } from './crypto';
import { carouselSchema, carouselSystemPrompt, carouselUserPrompt } from './prompts';
import type { CarouselContent, TemplateSpec } from './types';

/**
 * De onde vem a IA.
 *  - 'lovable': gateway do Lovable (compatível com a API da OpenAI),
 *    autenticado com LOVABLE_API_KEY. Gasta os créditos do teu workspace Lovable.
 *  - 'openai': a API da OpenAI, com chave própria.
 * Se houver chave do Lovable, é essa a escolhida — a não ser que AI_PROVIDER diga o contrário.
 */
export type ProvedorIA = 'openai' | 'lovable';

const GATEWAY_LOVABLE = 'https://ai.gateway.lovable.dev/v1';
const MODELO_LOVABLE = 'google/gemini-3-flash-preview';
const MODELO_OPENAI = 'gpt-5';

export function provedorIA(settings?: Partial<UserSettings> | null): ProvedorIA {
  const escolhido = process.env.AI_PROVIDER?.trim().toLowerCase();
  const temLovable = Boolean(process.env.LOVABLE_API_KEY?.trim());
  const temOpenAI = Boolean(decrypt(settings?.openai_key_enc ?? null) || process.env.OPENAI_API_KEY);

  if (escolhido === 'lovable' && temLovable) return 'lovable';
  if (escolhido === 'openai' && temOpenAI) return 'openai';
  return temLovable ? 'lovable' : 'openai';
}

/** Modelo por defeito de cada provedor. */
export function modeloPorDefeito(settings?: Partial<UserSettings> | null) {
  return provedorIA(settings) === 'lovable' ? MODELO_LOVABLE : MODELO_OPENAI;
}

export interface UserSettings {
  openai_key_enc: string | null;
  text_model: string;
  render_engine: 'local' | 'canva';
  brand_voice: string | null;
  /** documento mestre — quem é, para quem fala, objetivos */
  perfil: string | null;
}

/**
 * A chave a usar. Se houver a do Lovable, é essa; senão, a das Definições,
 * e por fim a do ambiente.
 */
export function resolveApiKey(settings?: Partial<UserSettings> | null): string {
  if (provedorIA(settings) === 'lovable') {
    const lovable = process.env.LOVABLE_API_KEY?.trim();
    if (lovable) return lovable;
  }
  const fromDb = decrypt(settings?.openai_key_enc ?? null);
  const key = fromDb || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      'Sem chave de IA. Põe a LOVABLE_API_KEY no .env.local, ou a chave da OpenAI em Definições.',
    );
  }
  return key;
}

/** Há chave configurada? Serve para decidir se a app pode chamar a OpenAI. */
export function hasApiKey(settings?: Partial<UserSettings> | null): boolean {
  try {
    return Boolean(resolveApiKey(settings));
  } catch {
    return false;
  }
}

export function getOpenAI(settings?: Partial<UserSettings> | null) {
  const lovable = provedorIA(settings) === 'lovable';
  return new OpenAI({
    apiKey: resolveApiKey(settings),
    // o gateway do Lovable fala a mesma língua que a API da OpenAI
    ...(lovable ? { baseURL: GATEWAY_LOVABLE } : {}),
  });
}

// ── Escrita do carrossel ─────────────────────────────────────
export async function writeCarousel(args: {
  settings: UserSettings;
  spec: TemplateSpec;
  slidesPer: number;
  topic?: string | null;
  sourceText?: string | null;
  extra?: string | null;
}): Promise<CarouselContent> {
  const { settings, spec, slidesPer, topic, sourceText, extra } = args;
  const client = getOpenAI(settings);
  const fieldKeys = spec.boxes.map((b) => b.key);

  const modelo = settings.text_model || modeloPorDefeito(settings);
  const mensagens = [
    { role: 'system' as const, content: carouselSystemPrompt(settings.brand_voice, settings.perfil) },
    {
      role: 'user' as const,
      content: carouselUserPrompt({ topic, sourceText, spec, slidesPer, extra }),
    },
  ];

  // Nem todos os modelos do gateway aceitam json_schema. Se recusar, pede JSON
  // por palavras e lê o que vier.
  let raw: string | null | undefined;
  try {
    const completion = await client.chat.completions.create({
      model: modelo,
      messages: mensagens,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'carrossel',
          strict: true,
          schema: carouselSchema(fieldKeys) as unknown as Record<string, unknown>,
        },
      },
    });
    raw = completion.choices[0]?.message?.content;
  } catch {
    const completion = await client.chat.completions.create({
      model: modelo,
      messages: [
        ...mensagens,
        {
          role: 'user' as const,
          content:
            'Responde só com o objeto JSON pedido, sem texto à volta e sem blocos de código.',
        },
      ],
    });
    raw = completion.choices[0]?.message?.content;
  }

  if (!raw) throw new Error('O modelo devolveu uma resposta vazia.');

  const limpo = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(limpo) as CarouselContent;

  // Normaliza: garante o número de slides e os índices.
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
