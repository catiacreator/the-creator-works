import { ok, withUser } from '@/lib/api';
import { extractText, kindFromMime, lerPdf } from '@/lib/extract';
import { briefingDoTexto } from '@/lib/documento-mestre';
import { TODOS_OS_CAMPOS, type Briefing } from '@/lib/briefing';
import { getSettings } from '@/lib/pipeline';
import { rapido } from '@/lib/ia';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Carregar o Documento Mestre e ficar com o briefing preenchido.
 *
 * Há dois caminhos. Se o documento saiu daqui, traz um bloco no fim e é só
 * lê-lo — exato, instantâneo, sem IA. Se veio de outro sítio (um PDF dela,
 * um Word), a Cát.IA lê o texto e arruma as respostas pelas perguntas.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const form = await request.formData();
  const ficheiro = form.get('ficheiro');
  if (!(ficheiro instanceof File)) throw new Error('Falta o ficheiro.');

  const buffer = Buffer.from(await ficheiro.arrayBuffer());
  const tipo = kindFromMime(ficheiro.type, ficheiro.name);

  // 1. o caminho curto: o documento saiu daqui e traz o briefing nas
  //    propriedades do ficheiro — leitura exata, sem IA e sem adivinhar
  let texto = '';
  if (tipo === 'pdf') {
    const pdf = await lerPdf(buffer);
    texto = pdf.text ?? '';
    const nasPropriedades = briefingDoTexto(String(pdf.info?.Keywords ?? ''));
    if (nasPropriedades) return ok({ briefing: nasPropriedades, origem: 'documento' });
  } else {
    texto = await extractText(buffer, tipo);
  }

  if (!texto?.trim()) throw new Error('Não consegui ler nada deste ficheiro.');

  // versões antigas do documento traziam o bloco impresso no fim
  const noTexto = briefingDoTexto(texto);
  if (noTexto) return ok({ briefing: noTexto, origem: 'documento' });

  // 2. o caminho longo: a Cát.IA arruma o texto pelas perguntas
  const settings = await getSettings(supabase, user.id);
  const perguntas = TODOS_OS_CAMPOS.map((c) => `"${c.id}": ${c.pergunta}`).join('\n');

  const resposta = await rapido({
    settings,
    system:
      'Recebes o documento de apresentação de uma criadora de conteúdo e arrumas o que lá está ' +
      'pelas perguntas de um briefing. Responde só com JSON: as chaves são os ids das perguntas, ' +
      'os valores são as respostas dela, com as palavras dela. O que não estiver no documento ' +
      'fica de fora — não inventes nada, não escrevas "não sei".',
    pedido: `As perguntas:\n${perguntas}\n\nO documento:\n${texto.slice(0, 24_000)}`,
    maxTokens: 4000,
  });

  const cru = resposta.slice(resposta.indexOf('{'), resposta.lastIndexOf('}') + 1);
  let lido: Briefing = {};
  try {
    lido = JSON.parse(cru) as Briefing;
  } catch {
    throw new Error('Li o ficheiro mas não consegui arrumar as respostas. Tenta com um PDF nosso.');
  }

  // só o que corresponde a perguntas reais
  const limpo: Briefing = {};
  for (const campo of TODOS_OS_CAMPOS) {
    const v = (lido[campo.id] ?? '').toString().trim();
    if (v) limpo[campo.id] = v;
  }

  if (!Object.keys(limpo).length) {
    throw new Error('Não encontrei respostas neste documento.');
  }

  return ok({ briefing: limpo, origem: 'ia' });
});
