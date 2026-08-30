import { ok, withUser } from '@/lib/api';
import { removeFiles } from '@/lib/storage';

export const runtime = 'nodejs';

/** Renomear e arrumar. O nome vive na coluna `prompt`. */
export const PATCH = withUser(async ({ user, supabase, request, params }) => {
  const body = (await request.json()) as { name?: string | null; folder?: string | null };
  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) patch.prompt = body.name?.trim() || null;
  if (body.folder !== undefined) patch.folder_id = body.folder?.trim() || null;
  if (!Object.keys(patch).length) throw new Error('Nada para mudar.');

  const { data, error } = await supabase
    .from('photos')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id, kind, storage_path, prompt, width, height, tags, folder_id, created_at')
    .single();
  if (error) throw new Error(error.message);

  return ok({ photo: data });
});

/** Apaga a fotografia — o ficheiro e a linha. */
export const DELETE = withUser(async ({ user, supabase, params }) => {
  const { data: photo } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!photo) throw new Error('Fotografia não encontrada.');

  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  await removeFiles(supabase, [photo.storage_path]);
  return ok({ removed: params.id });
});
