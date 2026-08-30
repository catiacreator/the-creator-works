import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';
import { conversa } from '@/lib/ia';
import { SEPARADORES, preenchimento, type Briefing } from '@/lib/briefing';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * A Cát.IA lê o briefing e diz o que está fraco.
 * Não é um elogio automático: pedimos-lhe que aponte o que falta e o que
 * está vago, porque é isso que estraga o conteúdo depois.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as { briefing?: Briefing };
  const briefing = body.briefing ?? {};
  const { feitos, total } = preenchimento(briefing);
  if (feitos === 0) throw new Error('Preenche pelo menos um campo antes de pedir a avaliação.');

  const respostas = SEPARADORES.map((sep) => {
    const linhas = sep.campos.map((c) => {
      const r = (briefing[c.id] ?? '').trim();
      return `- ${c.pergunta}\n  ${r || '(por responder)'}`;
    });
    return `## ${sep.titulo}\n${linhas.join('\n')}`;
  }).join('\n\n');

  const settings = await getSettings(supabase, user.id);

  const resposta = await conversa({
    settings,
    historico: [
      {
        role: 'user',
        content: `Isto é o meu briefing (${feitos} de ${total} campos respondidos). Avalia-o.

${respostas}

Responde assim, sem introdução:

**O que está forte** — no máximo três pontos, curtos, a dizer porquê.

**O que está fraco** — os campos vagos ou genéricos. Diz o campo, porque é fraco,
e dá um exemplo concreto de como o melhorar com o que já sabes de mim.

**O que falta** — os campos por responder que mais fazem falta para escrever
conteúdo que venda, por ordem de importância.

Sê direta. Um briefing elogiado e vago dá conteúdo elogiado e vago.`,
      },
    ],
  });

  return ok({ avaliacao: resposta, feitos, total });
});
