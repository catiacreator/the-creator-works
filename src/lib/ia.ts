import type { SupabaseClient } from '@supabase/supabase-js';
import {
  conversaClaude,
  escreverCarrosselClaude,
  rapidoClaude,
  temClaude,
  type Mensagem,
} from './claude';
import {
  getOpenAI,
  hasApiKey,
  modeloPorDefeito,
  writeCarousel,
  type UserSettings,
} from './openai';
import { chatSystemPrompt } from './prompts';
import type { CarouselContent, TemplateSpec } from './types';

/**
 * Quem responde: a Anthropic, o gateway do Lovable, ou a OpenAI.
 * A escolha é por ordem de preferência e faz-se aqui, num sítio só, para o
 * resto da app não ter de saber com quem está a falar.
 */

export type Provedor = 'claude' | 'lovable' | 'openai';

export function provedor(settings?: Partial<UserSettings> | null): Provedor {
  const forcado = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (forcado === 'claude' && temClaude()) return 'claude';
  if (forcado === 'lovable' && process.env.LOVABLE_API_KEY?.trim()) return 'lovable';
  if (forcado === 'openai') return 'openai';

  if (temClaude()) return 'claude';
  return process.env.LOVABLE_API_KEY?.trim() ? 'lovable' : 'openai';
}

export function temIA(settings?: Partial<UserSettings> | null): boolean {
  return temClaude() || hasApiKey(settings);
}

export function nomeDoProvedor(settings?: Partial<UserSettings> | null) {
  const p = provedor(settings);
  return p === 'claude' ? 'Claude' : p === 'lovable' ? 'IA do Lovable' : 'OpenAI';
}

/** Uma volta de conversa com a Cát.IA. */
export async function conversa(args: {
  settings: UserSettings;
  historico: Mensagem[];
  material?: string | null;
}): Promise<string> {
  const { settings, historico, material } = args;
  const system = chatSystemPrompt(settings.brand_voice, settings.perfil);

  if (provedor(settings) === 'claude') {
    return conversaClaude({ system, historico, extraSystem: material });
  }

  const client = getOpenAI(settings);
  const completion = await client.chat.completions.create({
    model: settings.text_model || modeloPorDefeito(settings),
    messages: [
      { role: 'system', content: system },
      ...(material ? [{ role: 'system' as const, content: material }] : []),
      ...historico.map((m) => ({ role: m.role, content: m.content })),
    ],
  });
  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Um pedido pequeno e urgente — ganchos, títulos, uma lista curta.
 * Vai por um caminho mais leve de propósito: quem está à espera no ecrã não
 * quer o melhor raciocínio do mundo, quer a resposta.
 */
export async function rapido(args: {
  settings: UserSettings;
  system: string;
  pedido: string;
  maxTokens?: number;
}): Promise<string> {
  if (provedor(args.settings) === 'claude') {
    return rapidoClaude(args);
  }

  const client = getOpenAI(args.settings);
  const completion = await client.chat.completions.create({
    model: args.settings.text_model || modeloPorDefeito(args.settings),
    max_tokens: args.maxTokens ?? 1500,
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.pedido },
    ],
  });
  return completion.choices[0]?.message?.content ?? '';
}

/** Escreve um carrossel completo. */
export async function escreverCarrossel(args: {
  settings: UserSettings;
  spec: TemplateSpec;
  slidesPer: number;
  topic?: string | null;
  sourceText?: string | null;
  extra?: string | null;
  /** O Material dela, filtrado pelo tema — os casos reais valem mais do que teoria. */
  material?: string | null;
}): Promise<CarouselContent> {
  if (provedor(args.settings) === 'claude') {
    return escreverCarrosselClaude(args);
  }
  // a OpenAI recebe-o colado às instruções adicionais
  return writeCarousel({
    ...args,
    extra: [args.extra, args.material].filter(Boolean).join('\n\n') || null,
  });
}

export type { Mensagem, SupabaseClient };
