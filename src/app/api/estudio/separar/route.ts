import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';
import { rapido } from '@/lib/ia';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Onde é que cada carrossel começa e acaba.
 *
 * Isto não é escrever: o texto já traz os carrosséis escritos, cada um com os
 * seus slides. O que falta é saber onde acaba um e começa o outro — e isso o
 * leitor de expressões regulares só acerta quando os títulos vêm num feitio
 * que ele conhece. Um documento que use outra convenção qualquer engana-o, e
 * tudo vem colado num carrossel só.
 *
 * Por isso a Cát.IA lê as linhas numeradas e devolve apenas números: onde
 * começa e onde acaba cada carrossel, e como se chama. O texto é depois
 * recortado aqui, do original.
 *
 * É de propósito que ela não devolve texto nenhum: assim não há nada que ela
 * possa reescrever, encurtar ou inventar. Os slides que saem daqui são,
 * palavra por palavra, os que entraram.
 */

interface Marca {
  titulo?: string;
  inicio?: number;
  fim?: number;
}

/** Lê os slides de um pedaço de texto que já se sabe ser um só carrossel. */
function slidesDoPedaco(linhas: string[]): string[] {
  const slides: string[] = [];
  let espera = false;

  for (const linha of linhas) {
    const l = linha.trim();
    if (!l) continue;
    if (/^-{3,}$/.test(l) || /^={3,}$/.test(l)) continue;

    // "Slide 1: o texto" (com ou sem ** à volta do marcador)
    const marcado = l.match(/^[—–\-*#\s]*Slide\s*\d+\s*[:\-—–.)]\s*\**\s*(.+?)\**\s*$/i);
    if (marcado) {
      slides.push(marcado[1].replace(/\*/g, '').trim());
      espera = false;
      continue;
    }

    // "Slide 1" sozinho — o texto vem a seguir
    if (/^[—–\-*#\s]*Slide\s*\d+\s*[:\-—–.)]?\s*\**\s*$/i.test(l)) {
      espera = true;
      continue;
    }
    if (espera) {
      slides.push(l.replace(/\*/g, '').trim());
      espera = false;
      continue;
    }

    const ponto = l.match(/^[-•*—–]\s+(.{2,})$/);
    const numero = l.match(/^\d{1,3}[.)]\s+(.{2,})$/);
    const corpo = ponto?.[1] || numero?.[1];
    if (corpo) slides.push(corpo.replace(/\*/g, '').trim());
  }

  // nada marcado: cada linha com substância vale por um slide
  if (!slides.length) {
    return linhas
      .map((l) => l.trim().replace(/\*/g, '').trim())
      .filter((l) => l.length > 2 && !/^-{3,}$/.test(l));
  }
  return slides;
}

export const POST = withUser(async ({ user, supabase, request }) => {
  const { texto } = (await request.json()) as { texto?: string };
  const cru = (texto ?? '').trim();
  if (!cru) throw new Error('Cola primeiro o texto.');

  const linhas = cru.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // as linhas com substância, numeradas — é isto que ela vê
  const uteis: Array<{ n: number; t: string }> = [];
  linhas.forEach((l, i) => {
    const t = l.trim();
    if (t) uteis.push({ n: i, t });
  });
  if (!uteis.length) throw new Error('Este texto está vazio.');

  const numerado = uteis
    .map(({ n, t }) => `${n}| ${t.length > 200 ? `${t.slice(0, 200)}…` : t}`)
    .join('\n');

  const settings = await getSettings(supabase, user.id);

  const sistema = `
És a Cát.IA. A tua tarefa aqui é só uma: dizer onde cada carrossel começa e
acaba num documento que já os traz escritos.

NÃO escreves nada. NÃO reescreves nada. NÃO resumes. Devolves números.

Um carrossel é um bloco de slides que conta uma ideia do princípio ao fim.
Normalmente vem antecedido de um título — mas o título pode estar escrito de
mil maneiras: "CARROSSEL 3 — Nome", "**Nome**", "## Nome", "Post 4: Nome",
"3) Nome", ou só o nome sozinho numa linha antes do primeiro slide.

Um carrossel novo começa sempre que:
- aparece um título novo, seja qual for o feitio; ou
- a numeração dos slides volta a 1; ou
- o assunto muda por completo e há um separador (uma linha de --- ou ===).

Atenção ao mais importante: se a numeração dos slides recomeça em 1, isso é
quase sempre um carrossel novo, mesmo que não haja título nenhum à vista.
`.trim();

  const pedido = `Aqui está o documento, uma linha por número.

"""
${numerado.slice(0, 60000)}
"""

Devolve só o JSON, sem uma palavra à volta:
{ "carrosseis": [ { "titulo": "nome do carrossel", "inicio": <número da primeira linha>, "fim": <número da última linha> } ] }

Regras dos números:
- "inicio" é a linha do título do carrossel (ou do primeiro slide, se não houver título).
- "fim" é a última linha que ainda pertence a esse carrossel.
- Os blocos não se sobrepõem e vão do princípio ao fim do documento, por ordem.
- Se só houver mesmo um carrossel, devolve um só bloco.`;

  let marcas: Marca[] = [];
  try {
    const resposta = await rapido({ settings, system: sistema, pedido, maxTokens: 3000 });
    const bloco = resposta.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const limpo = (bloco ? bloco[1] : resposta).trim();
    const abre = limpo.indexOf('{');
    const fecha = limpo.lastIndexOf('}');
    if (abre === -1 || fecha === -1) throw new Error('resposta sem JSON');
    const lido = JSON.parse(limpo.slice(abre, fecha + 1)) as { carrosseis?: Marca[] };
    marcas = lido.carrosseis ?? [];
  } catch (e) {
    const porque = e instanceof Error ? e.message : 'erro inesperado';
    throw new Error(
      `A Cát.IA não conseguiu separar este texto: ${porque}. Ficam como o leitor os viu — para os separares à mão, põe uma linha de três traços entre eles.`,
    );
  }

  // recorta do original — o que sai daqui nunca passou pela IA
  const carrosseis = marcas
    .map((m, i) => {
      const inicio = Math.max(0, Math.min(linhas.length - 1, Number(m.inicio ?? 0)));
      const fim = Math.max(inicio, Math.min(linhas.length - 1, Number(m.fim ?? linhas.length - 1)));
      const pedaco = linhas.slice(inicio, fim + 1);

      // a linha do título não é um slide
      const primeira = (pedaco[0] ?? '').trim();
      const tituloDado = (m.titulo ?? '').trim();
      const semTitulo =
        tituloDado &&
        primeira &&
        !/^[—–\-*#\s]*Slide\s*\d+/i.test(primeira) &&
        primeira.replace(/[*#\s]/g, '').toLowerCase().includes(
          tituloDado.replace(/[*#\s]/g, '').toLowerCase().slice(0, 12),
        )
          ? pedaco.slice(1)
          : pedaco;

      return {
        titulo: tituloDado || `Carrossel ${i + 1}`,
        slides: slidesDoPedaco(semTitulo),
      };
    })
    .filter((c) => c.slides.length > 0);

  if (!carrosseis.length) {
    throw new Error('A Cát.IA leu o texto mas não encontrou slides nenhuns.');
  }

  return ok({ carrosseis });
});
