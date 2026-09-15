import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';
import { rapido } from '@/lib/ia';
import { marcarConsumo } from '@/lib/consumo';
import { DROP_CONTENT, SEPARAR_CARROSSEL, type DropContent } from '@/snap/drop-content';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * O Drop Content do CarouselSnap, a correr aqui.
 *
 * Do lado do Snap isto é a edge function `drop-content`: corre em Deno, no
 * Supabase dele, e fala com o gateway do Lovable com a chave dele. Nada
 * disso vem para cá — o que vem são os prompts, palavra por palavra, e a
 * forma da resposta.
 *
 * O motor passa a ser o que esta app já tem: a chave que já está configurada,
 * o contador de créditos que já existe, a sessão que já é conferida. É isso
 * que «portar» quer dizer, e é diferente de copiar: o comportamento fica
 * igual, as canalizações passam a ser as daqui.
 *
 * Duas maneiras de trabalhar, e a diferença entre elas é tudo:
 *
 *   **escrever** — dás um tema ou um texto solto e ela escreve o carrossel,
 *   com o número exacto de slides que pediste.
 *
 *   **separar** — já escreveste o roteiro e ela só o parte em slides, sem
 *   mexer numa palavra. O prompt diz isso quatro vezes de maneiras
 *   diferentes, e com razão: um modelo a quem se dá texto bom tem sempre a
 *   tentação de o «melhorar», e aqui melhorar é estragar.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as {
    conteudo?: string;
    modo?: 'escrever' | 'separar';
    lingua?: string;
    slides?: number;
  };

  const conteudo = body.conteudo?.trim();
  if (!conteudo) throw new Error('O conteúdo é obrigatório.');

  // separar não escreve nada de novo — parte o que já está escrito. Custa o
  // mesmo que dividir um texto, e não o mesmo que escrever um carrossel.
  const escrever = body.modo !== 'separar';
  await marcarConsumo(supabase, user.email, escrever ? 'carrossel' : 'separar');

  const settings = await getSettings(supabase, user.id);

  // o Snap trava entre 3 e 20, e o mesmo travão vem com ele: menos de três
  // não é um carrossel, e mais de vinte ninguém desliza até ao fim
  const quantos = Math.min(20, Math.max(3, body.slides ?? 8));
  const lingua = body.lingua?.trim() || 'pt-PT';

  const pedido = escrever
    ? `Língua: ${lingua}\nNúmero de slides: ${quantos} (gera EXATAMENTE ${quantos} slides)\n\nConteúdo para transformar em carrossel:\n\n${conteudo}`
    : `Língua: ${lingua}\n\nRoteiro de carrossel para separar em slides:\n\n${conteudo}`;

  const resposta = await rapido({
    settings,
    system: escrever ? DROP_CONTENT : SEPARAR_CARROSSEL,
    pedido,
    // vinte slides com dois textos cada precisam de espaço; apertar isto
    // corta o JSON a meio e a resposta deixa de se poder ler
    maxTokens: 4000,
  });

  const bloco = resposta.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const cru = (bloco ? bloco[1] : resposta).trim();
  const inicio = cru.indexOf('{');
  const fim = cru.lastIndexOf('}');

  let saiu: DropContent | null = null;
  try {
    if (inicio !== -1 && fim !== -1) {
      saiu = JSON.parse(cru.slice(inicio, fim + 1)) as DropContent;
    }
  } catch (e) {
    console.error('[drop-content] JSON ilegível:', e instanceof Error ? e.message : e);
  }

  if (!saiu?.slides?.length) {
    console.error('[drop-content] sem slides:', resposta.slice(0, 400));
    throw new Error('Não consegui montar o carrossel. Tenta outra vez.');
  }

  // o número de cada slide é para se confiar nele na página: se o modelo o
  // trocar ou o repetir, a ordem vai atrás
  const slides = saiu.slides.map((s, i) => ({
    numero: i + 1,
    tipo_slide: s.tipo_slide ?? (i === 0 ? 'capa' : 'conteudo'),
    texto_principal: String(s.texto_principal ?? '').trim(),
    texto_secundario: String(s.texto_secundario ?? '').trim(),
    nota_design: String(s.nota_design ?? '').trim(),
  }));

  return ok({ ...saiu, slides, total_slides: slides.length });
});
