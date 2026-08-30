import { ok, withUser } from '@/lib/api';
import { extractText, kindFromMime } from '@/lib/extract';
import { propor } from '@/lib/dividir';
import { designParaSpec, ehDesignDoEditor } from '@/lib/design-para-spec';
import { defaultSpec } from '@/lib/render';
import type { TemplateSpec } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Lê um documento (PDF, DOCX, XLSX, TXT) ou um texto colado e diz quantos
 * carrosséis lá cabem, já divididos. Não grava nada — é só a proposta.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const contentType = request.headers.get('content-type') ?? '';
  let texto = '';
  let origem: string | null = null;
  let slidesPorCarrossel = 7;
  let templateId: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    slidesPorCarrossel = Number(form.get('slides') ?? 7);
    templateId = (form.get('template_id') as string | null) || null;

    if (!(file instanceof File) || file.size === 0) throw new Error('Nenhum ficheiro recebido.');
    const buffer = Buffer.from(await file.arrayBuffer());
    texto = await extractText(buffer, kindFromMime(file.type, file.name));
    origem = file.name;
    if (!texto.trim()) throw new Error('Não consegui ler texto nenhum desse ficheiro.');
  } else {
    const body = (await request.json()) as {
      texto?: string;
      slides?: number;
      template_id?: string | null;
    };
    texto = (body.texto ?? '').trim();
    slidesPorCarrossel = body.slides ?? 7;
    templateId = body.template_id ?? null;
    if (!texto) throw new Error('Cola um texto ou carrega um ficheiro.');
  }

  // a capacidade de cada carrossel depende das caixas do template
  let spec: TemplateSpec = defaultSpec();
  const { data: template } = templateId
    ? await supabase.from('templates').select('spec').eq('id', templateId).maybeSingle()
    : await supabase
        .from('templates')
        .select('spec')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

  if (template?.spec) {
    spec = ehDesignDoEditor(template.spec)
      ? designParaSpec(template.spec)
      : (template.spec as TemplateSpec);
  }

  const carrosseis = propor({ texto, spec, slidesPorCarrossel });

  return ok({
    origem,
    caracteres: texto.length,
    carrosseis: carrosseis.map((c, i) => ({ ...c, indice: i })),
  });
});
