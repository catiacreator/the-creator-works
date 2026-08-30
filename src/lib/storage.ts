import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'assets';

/** Caminho sempre prefixado pelo id do utilizador — é o que a política de RLS exige. */
export function userPath(userId: string, ...parts: string[]) {
  return [userId, ...parts].join('/');
}

export async function uploadBuffer(
  supabase: SupabaseClient,
  path: string,
  buffer: Buffer,
  contentType = 'image/png',
) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload falhou (${path}): ${error.message}`);
  return path;
}

export async function downloadBuffer(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Download falhou (${path}): ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function signedUrl(supabase: SupabaseClient, path: string, seconds = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signedUrls(
  supabase: SupabaseClient,
  paths: string[],
  seconds = 3600,
): Promise<Record<string, string>> {
  const clean = paths.filter(Boolean);
  if (!clean.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(clean, seconds);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  }
  return map;
}

export async function removeFiles(supabase: SupabaseClient, paths: string[]) {
  if (!paths.length) return;
  await supabase.storage.from(BUCKET).remove(paths);
}
