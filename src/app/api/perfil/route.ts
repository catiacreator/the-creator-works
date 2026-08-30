import { ok, withUser } from '@/lib/api';
import { extractText, kindFromMime } from '@/lib/extract';
import { briefingParaTexto, type Briefing } from '@/lib/briefing';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * O documento mestre: quem és, o teu nicho, o teu público, os teus objetivos.
 * Vai como contexto em todos os pedidos à IA — no chat e na escrita dos carrosséis.
 */
export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('settings')
    .select('perfil, perfil_origem, perfil_atualizado_em, briefing')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: perfilRow } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  return ok({
    nome: perfilRow?.full_name ?? '',
    perfil: data?.perfil ?? '',
    briefing: (data?.briefing ?? {}) as Briefing,
    origem: data?.perfil_origem ?? null,
    atualizado_em: data?.perfil_atualizado_em ?? null,
  });
});

/** Aceita um ficheiro (PDF, DOCX, TXT) ou texto colado. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const contentType = request.headers.get('content-type') ?? '';
  let texto = '';
  let origem: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) throw new Error('Nenhum ficheiro recebido.');

    const buffer = Buffer.from(await file.arrayBuffer());
    texto = (await extractText(buffer, kindFromMime(file.type, file.name))).trim();
    if (!texto) throw new Error('Não consegui ler texto nenhum desse ficheiro.');
    origem = file.name;
  } else {
    const body = (await request.json()) as {
      perfil?: string;
      briefing?: Briefing;
      nome?: string;
    };

    // o nome vive no perfil da conta, não no briefing
    if (body.nome !== undefined) {
      await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: body.nome.trim() || null }, { onConflict: 'id' });
      if (!body.briefing && body.perfil === undefined) {
        return ok({ nome: body.nome.trim() });
      }
    }

    // o briefing manda: o texto para a IA é gerado a partir das respostas
    if (body.briefing) {
      const briefing = body.briefing;
      const { error } = await supabase.from('settings').upsert(
        {
          user_id: user.id,
          briefing,
          perfil: briefingParaTexto(briefing) || null,
          perfil_origem: null,
          perfil_atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      if (error) throw new Error(error.message);
      return ok({ briefing, atualizado_em: new Date().toISOString() });
    }

    texto = (body.perfil ?? '').trim();
    origem = null;
  }

  const { error } = await supabase.from('settings').upsert(
    {
      user_id: user.id,
      perfil: texto || null,
      perfil_origem: origem,
      perfil_atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(error.message);

  return ok({ perfil: texto, origem, atualizado_em: new Date().toISOString() });
});
