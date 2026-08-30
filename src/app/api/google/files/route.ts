import { ok, withUser } from '@/lib/api';
import * as google from '@/lib/google';
import { extractText, kindFromMime } from '@/lib/extract';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 120;

async function tokenFor(supabase: SupabaseClient, userId: string) {
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle();
  if (!integration) throw new Error('Google Drive não está ligado.');

  return google.validAccessToken(integration, async (patch) => {
    await supabase.from('integrations').update(patch).eq('id', integration.id);
  });
}

/** Lista ficheiros do Drive (PDF, Docs, DOCX, TXT). */
export const GET = withUser(async ({ user, supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const token = await tokenFor(supabase, user.id);
  const files = await google.listFiles(token, searchParams.get('q') ?? undefined);
  return ok({ files });
});

/** Importa ficheiros escolhidos do Drive como fontes de conteúdo. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as { files: google.DriveFile[] };
  if (!body.files?.length) throw new Error('Nenhum ficheiro escolhido.');

  const token = await tokenFor(supabase, user.id);
  const imported = [];

  for (const file of body.files) {
    const { buffer, mimeType } = await google.downloadFile(token, file);
    const kind = kindFromMime(mimeType, file.name);
    const content = await extractText(buffer, kind);
    if (!content) continue;

    const { data, error } = await supabase
      .from('sources')
      .insert({
        user_id: user.id,
        name: file.name.replace(/\.[^.]+$/, ''),
        kind: 'drive',
        origin: file.id,
        content,
        chars: content.length,
      })
      .select('id, name, kind, chars, created_at')
      .single();
    if (error) throw new Error(error.message);
    imported.push(data);
  }

  return ok({ sources: imported });
});
