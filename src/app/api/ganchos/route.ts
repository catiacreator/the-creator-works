import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';
import { rapido } from '@/lib/ia';
import { TIPOLOGIAS, promptDosGanchos, sistemaDosGanchos, type Gancho } from '@/lib/ganchos';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** Nove ganchos para um assunto, cada um por uma tipologia diferente. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as {
    assunto: string;
    contexto?: string;
    angulo?: string;
    /** 0, 1 ou 2 — o ecrã pede os três ao mesmo tempo e mostra cada um mal chega. */
    grupo?: number;
  };
  if (!body.assunto?.trim()) throw new Error('Falta o assunto.');

  const settings = await getSettings(supabase, user.id);
  const system = sistemaDosGanchos(settings.brand_voice, settings.perfil);

  // três pedidos pequenos em vez de um grande: são nove frases curtas e
  // ninguém tem de ficar a olhar para o ecrã à espera das nove.
  const todos = [TIPOLOGIAS.slice(0, 3), TIPOLOGIAS.slice(3, 6), TIPOLOGIAS.slice(6)];
  const grupos =
    typeof body.grupo === 'number' ? [todos[body.grupo] ?? todos[0]] : todos;

  const partes = await Promise.all(
    grupos.map(async (tipologias) => {
      try {
        const resposta = await rapido({
          settings,
          system,
          pedido: promptDosGanchos({ ...body, tipologias }),
          maxTokens: 700,
        });
        const bloco = resposta.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const cru = (bloco ? bloco[1] : resposta).trim();
        const inicio = cru.indexOf('[');
        const fim = cru.lastIndexOf(']');
        if (inicio === -1 || fim === -1) {
          console.error('[ganchos] sem lista:', resposta.slice(0, 300));
          return [];
        }
        return JSON.parse(cru.slice(inicio, fim + 1)) as Gancho[];
      } catch (e) {
        // um grupo que falhe não leva os outros atrás
        console.error('[ganchos] falhou:', e instanceof Error ? e.message : e);
        return [];
      }
    }),
  );

  const ganchos = partes.flat().filter((g) => g?.gancho?.trim());
  if (!ganchos.length) throw new Error('Não consegui escrever os ganchos. Tenta outra vez.');

  return ok({ ganchos });
});
