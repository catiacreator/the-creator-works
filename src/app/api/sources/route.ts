import { ok, withUser } from '@/lib/api';
import { extractText, kindFromMime } from '@/lib/extract';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('sources')
    .select('id, name, kind, origin, chars, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return ok({ sources: data ?? [] });
});

/**
 * POST multipart  → um ou mais ficheiros (PDF / DOCX / TXT / MD)
 * POST JSON       → { name, content } para colar texto à mão
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { name?: string; content?: string };
    const content = (body.content ?? '').trim();
    if (!content) throw new Error('Texto vazio.');
    const { data, error } = await supabase
      .from('sources')
      .insert({
        user_id: user.id,
        name: body.name?.trim() || 'Texto colado',
        kind: 'text',
        content,
        chars: content.length,
      })
      .select('id, name, kind, chars, created_at')
      .single();
    if (error) throw new Error(error.message);
    return ok({ sources: [data] });
  }

  const form = await request.formData();
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (!files.length) throw new Error('Nenhum ficheiro recebido.');

  const inserted = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = kindFromMime(file.type, file.name);
    const content = await extractText(buffer, kind);
    if (!content) continue;

    const { data, error } = await supabase
      .from('sources')
      .insert({
        user_id: user.id,
        name: file.name.replace(/\.[^.]+$/, ''),
        kind,
        origin: file.name,
        content,
        chars: content.length,
      })
      .select('id, name, kind, chars, created_at')
      .single();
    if (error) throw new Error(error.message);
    inserted.push(data);
  }

  return ok({ sources: inserted });
});
