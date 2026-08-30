import { ok, withUser } from '@/lib/api';
import { extractText, kindFromMime } from '@/lib/extract';
import { propor } from '@/lib/dividir';
import { defaultSpec } from '@/lib/render';
import { extrairCarrosseis } from '@/lib/extrair-slides';
import { getSettings } from '@/lib/pipeline';
import { rapido } from '@/lib/ia';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Lê o documento e devolve os carrosséis que lá estão dentro, já em slides.
 *
 * Dois caminhos. Se o texto já vier estruturado — "Slide 1:", uma lista, um
 * título por carrossel — não se gasta IA nenhuma: lê-se e pronto, é
 * instantâneo. Se vier corrido, como um PDF ou um documento de trabalho, o
 * documento é partido em pedaços do tamanho certo e cada pedaço vira slides
 * ao mesmo tempo que os outros.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const tipoDoPedido = request.headers.get('content-type') ?? '';
  let texto = '';
  let origem: string | null = null;
  let porCarrossel = 7;

  if (tipoDoPedido.includes('multipart/form-data')) {
    const form = await request.formData();
    const ficheiro = form.get('file');
    porCarrossel = Number(form.get('slides') ?? 7);
    if (!(ficheiro instanceof File) || ficheiro.size === 0) {
      throw new Error('Não recebi nenhum ficheiro.');
    }
    const buffer = Buffer.from(await ficheiro.arrayBuffer());
    texto = await extractText(buffer, kindFromMime(ficheiro.type, ficheiro.name));
    origem = ficheiro.name;
    if (!texto.trim()) {
      throw new Error('Não consegui ler texto nenhum desse ficheiro.');
    }
  } else {
    const body = (await request.json()) as { texto?: string; slides?: number };
    texto = (body.texto ?? '').trim();
    porCarrossel = body.slides ?? 7;
    if (!texto) throw new Error('Cola um texto ou carrega um ficheiro.');
  }

  // 1. o texto já vem escrito em slides? só conta se estiver mesmo marcado —
  // num PDF de texto corrido os parágrafos são parágrafos, não slides, e por
  // isso o último recurso do leitor vai desligado
  const lidos = extrairCarrosseis(texto, false);
  if (lidos.length) {
    return ok({ carrosseis: lidos, origem, comIA: false, texto });
  }

  // 2. não vem — parte-se o documento e a IA escreve os slides de cada pedaço
  const pedacos = propor({
    texto,
    spec: defaultSpec(),
    slidesPorCarrossel: porCarrossel,
    maximo: 120,
  });
  if (!pedacos.length) throw new Error('Este documento não dá para nenhum carrossel.');

  const settings = await getSettings(supabase, user.id);
  const sistema = `
És a Cát.IA, a parceira de escrita desta criadora portuguesa de Instagram.
Transformas um pedaço de documento nos slides de um carrossel.

${settings.brand_voice?.trim() || 'Português de Portugal, tratamento por tu. Frases curtas, sem jargão, sem emojis.'}

Regras que não se quebram: o primeiro slide é o gancho, uma ideia por slide,
entre 15 e 25 palavras cada, o último slide é o comando. Nunca inventes
números, percentagens ou estudos que não estejam no texto.
`.trim();

  /** Escreve um pedaço. Devolve null se falhar — um não leva os outros atrás. */
  async function escrever(p: (typeof pedacos)[number]) {
    {
      try {
        const resposta = await rapido({
          settings,
          system: sistema,
          maxTokens: 1600,
          pedido: `Escreve ${porCarrossel} slides a partir deste texto:

"""
${p.texto.slice(0, 9000)}
"""

Responde só com o JSON, sem uma palavra à volta:
{ "titulo": "nome curto do carrossel", "slides": ["texto do slide 1", "…"] }`,
        });

        const bloco = resposta.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const cru = (bloco ? bloco[1] : resposta).trim();
        const inicio = cru.indexOf('{');
        const fim = cru.lastIndexOf('}');
        if (inicio === -1 || fim === -1) return null;

        const lido = JSON.parse(cru.slice(inicio, fim + 1)) as {
          titulo?: string;
          slides?: string[];
        };
        const slides = (lido.slides ?? []).filter((s) => typeof s === 'string' && s.trim());
        if (!slides.length) return null;

        return { titulo: (lido.titulo || p.titulo).trim(), slides };
      } catch {
        return null;
      }
    }
  }

  // seis de cada vez: um documento com sessenta secções são sessenta pedidos,
  // e mandá-los todos ao mesmo tempo só serve para apanhar com um travão
  const feitos: Array<{ titulo: string; slides: string[] } | null> = [];
  for (let i = 0; i < pedacos.length; i += 6) {
    const lote = await Promise.all(pedacos.slice(i, i + 6).map(escrever));
    feitos.push(...lote);
  }

  const carrosseis = feitos.filter((c): c is { titulo: string; slides: string[] } => !!c);
  if (!carrosseis.length) {
    throw new Error('Não consegui tirar carrosséis deste documento. Tenta outra vez.');
  }

  return ok({
    carrosseis,
    origem,
    comIA: true,
    // o texto do ficheiro volta para a caixa, para ela poder mexer e voltar a analisar
    texto,
    // o que o documento dava, mesmo que algum pedaço tenha falhado
    encontrados: pedacos.length,
  });
});
