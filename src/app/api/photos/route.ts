import { ok, withUser } from '@/lib/api';
import { signedUrls, uploadBuffer, userPath } from '@/lib/storage';
import type { PhotoRow } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const GET = withUser(async ({ user, supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const pasta = searchParams.get('pasta');

  let query = supabase
    .from('photos')
    .select('id, kind, storage_path, prompt, width, height, tags, folder_id, created_at')
    .eq('user_id', user.id)
    // as efémeras vieram de uma notícia e vivem só dentro do carrossel delas
    .neq('kind', 'efemera')
    .order('created_at', { ascending: false })
    .limit(500);

  if (pasta === '__sem_pasta__') query = query.is('folder_id', null);
  else if (pasta) query = query.eq('folder_id', pasta);

  const { data } = await query;

  const photos = (data ?? []) as PhotoRow[];
  const urls = await signedUrls(supabase, photos.map((p) => p.storage_path));
  return ok({
    photos: photos.map((p) => ({ ...p, url: urls[p.storage_path] ?? null })),
  });
});

/** Upload de fotografias próprias para a biblioteca. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const form = await request.formData();
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (!files.length) throw new Error('Nenhuma imagem recebida.');

  const created = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = userPath(user.id, 'photos', `${crypto.randomUUID()}.${ext}`);
    await uploadBuffer(supabase, path, buffer, file.type || 'image/png');

    const nome = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const pasta = (form.get('pasta') as string | null)?.trim();

    const { data, error } = await supabase
      .from('photos')
      .insert({
        user_id: user.id,
        kind: 'upload',
        storage_path: path,
        prompt: nome || null,
        folder_id: pasta || null,
      })
      .select('id, kind, storage_path, prompt, width, height, tags, folder_id, created_at')
      .single();
    if (error) throw new Error(error.message);
    created.push(data);
  }

  const urls = await signedUrls(supabase, created.map((p) => p.storage_path));
  return ok({ photos: created.map((p) => ({ ...p, url: urls[p.storage_path] ?? null })) });
});
