import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';
import { rapido } from '@/lib/ia';
import { regrasDoGancho } from '@/lib/ganchos';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * Escreve o carrossel a partir do gancho escolhido.
 *
 * É texto e mais nada — quem o desenha é o editor ou o Carrosséis Creator, à
 * escolha dela. Por isso vai pelo caminho rápido: são oito frases curtas.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as {
    gancho: string;
    assunto?: string;
    contexto?: string;
    angulo?: string;
    instrucao?: string;
    slides?: number;
  };
  if (!body.gancho?.trim()) throw new Error('Falta o gancho.');

  const quantos = Math.min(Math.max(body.slides ?? 8, 3), 12);
  const settings = await getSettings(supabase, user.id);

  const sistema = `
És a Cát.IA, a parceira de escrita desta criadora portuguesa de Instagram.

${settings.brand_voice?.trim() || 'Português de Portugal, tratamento por tu. Frases curtas, sem jargão, sem emojis.'}
${settings.perfil?.trim() ? `\nQuem escreve, e para quem:\n${settings.perfil.trim().slice(0, 2000)}` : ''}
`.trim();

  const resposta = await rapido({
    settings,
    system: sistema,
    maxTokens: 2000,
    pedido: `Escreve os ${quantos} slides deste carrossel.

${body.assunto ? `ASSUNTO: ${body.assunto}` : ''}
${body.contexto ? `CONTEXTO: ${body.contexto}` : ''}
${body.angulo ? `ÂNGULO: ${body.angulo}` : ''}

${regrasDoGancho(body.gancho.trim(), body.instrucao)}

Responde só com o JSON, sem uma palavra à volta:
{ "titulo": "nome curto do carrossel", "slides": ["o gancho, tal e qual, no slide 1", "…"] }`,
  });

  const bloco = resposta.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const cru = (bloco ? bloco[1] : resposta).trim();
  const inicio = cru.indexOf('{');
  const fim = cru.lastIndexOf('}');
  if (inicio === -1 || fim === -1) throw new Error('Não consegui escrever o carrossel.');

  const lido = JSON.parse(cru.slice(inicio, fim + 1)) as { titulo?: string; slides?: string[] };
  const slides = (lido.slides ?? []).filter((s) => typeof s === 'string' && s.trim());
  if (slides.length < 2) throw new Error('Não consegui escrever o carrossel. Tenta outra vez.');

  // o gancho é a capa, aconteça o que acontecer
  if (!slides[0].toLowerCase().includes(body.gancho.trim().toLowerCase().slice(0, 25))) {
    slides.unshift(body.gancho.trim());
  }

  return ok({ titulo: (lido.titulo || body.gancho).trim().slice(0, 90), slides });
});
