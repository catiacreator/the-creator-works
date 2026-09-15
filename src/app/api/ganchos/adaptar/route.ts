import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';
import { rapido } from '@/lib/ia';
import { sistemaDosGanchos } from '@/lib/ganchos';
import { marcarConsumo } from '@/lib/consumo';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Pegar num molde da biblioteca e vesti-lo com o nicho de quem pede.
 *
 * A biblioteca tem cem aberturas prontas, e todas têm buracos:
 *
 *     «Não sei quem precisa de ouvir isto mas: [verdade do teu nicho]»
 *
 * O molde dá a forma — o ritmo, a tensão, o sítio onde a frase corta. O que
 * ele não dá é a substância, e é exactamente aí que a maior parte das pessoas
 * pára: olha para o [colchete], não sabe o que lá pôr, e fecha a página. Cem
 * ganchos bons que ninguém usa valem menos do que um usado.
 *
 * Isto preenche os colchetes, e preenche-os com o que ESTA pessoa faz — o
 * briefing dela já está escrito, e é para isto que ele serve.
 *
 * Dez e não um, por uma razão que se aprende a olhar para quem escolhe: a
 * primeira frase que sai é quase sempre a mais óbvia, e ninguém sabe se
 * gosta dela sem ter ao lado as que não escolheu. Dez chegam para haver uma
 * que soa a ela, e são poucas que baste para se lerem todas.
 *
 * Custa o mesmo que os nove ganchos escritos de raiz: é o mesmo trabalho da
 * Cát.IA, com um ponto de partida diferente.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  await marcarConsumo(supabase, user.email, 'ganchos');

  const body = (await request.json()) as { molde?: string; nicho?: string };
  const molde = body.molde?.trim();
  if (!molde) throw new Error('Falta o gancho a adaptar.');

  const settings = await getSettings(supabase, user.id);

  /**
   * Sem briefing respondido não há nicho de onde tirar nada.
   *
   * Podia inventar-se um genérico e devolver dez frases que servem a toda a
   * gente — que é o mesmo que não servirem a ninguém, e é precisamente o que
   * esta app existe para não fazer. Mais vale dizer o que falta.
   */
  const nicho = body.nicho?.trim() || settings.perfil?.trim();
  if (!nicho) {
    throw new Error(
      'Ainda não sei do que falas. Responde ao briefing em Sobre mim e eu adapto os ganchos ao teu nicho.',
    );
  }

  const resposta = await rapido({
    settings,
    system: sistemaDosGanchos(settings.brand_voice, settings.perfil),
    pedido: `
Este é um molde de gancho, com buracos entre colchetes:

${molde}

Escreve DEZ versões dele, já preenchidas para quem escreve — sem colchetes
nenhuns, prontas a gravar.

Regras:
· Mantém a forma do molde: o ritmo, o sítio onde a frase corta, a tensão.
  O que muda é só o que está entre colchetes.
· Cada uma tem de ser sobre uma coisa DIFERENTE do nicho. Dez maneiras de
  dizer o mesmo não servem para escolher.
· Concreto: uma situação que se reconhece, não uma abstração.
· Nada de percentagens nem estatísticas — nunca. Um número que não venha de
  uma fonte real é uma mentira com a cara dela em cima.
· Sem emojis. Sem dois pontos a separar título e subtítulo.
· Português de Portugal, tratamento por tu.

Responde só com o JSON, sem uma palavra à volta:
["frase um", "frase dois", …]
`.trim(),
    maxTokens: 900,
  });

  // o modelo às vezes embrulha o JSON num bloco de código, às vezes não
  const bloco = resposta.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const cru = (bloco ? bloco[1] : resposta).trim();
  const inicio = cru.indexOf('[');
  const fim = cru.lastIndexOf(']');

  let frases: string[] = [];
  try {
    if (inicio !== -1 && fim !== -1) {
      frases = (JSON.parse(cru.slice(inicio, fim + 1)) as unknown[])
        .map((f) => String(f ?? '').trim())
        .filter(Boolean);
    }
  } catch (e) {
    console.error('[adaptar] lista ilegível:', e instanceof Error ? e.message : e);
  }

  if (!frases.length) {
    console.error('[adaptar] sem frases:', resposta.slice(0, 300));
    throw new Error('Não consegui adaptar este gancho. Tenta outra vez.');
  }

  return ok({ frases });
});
