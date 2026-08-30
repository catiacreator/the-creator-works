import { ok, withUser } from '@/lib/api';
import { signedUrls, uploadBuffer, userPath } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * As fontes dela. Ficam no perfil — sobrevivem a logout e a outro computador.
 *
 * Guardam-se duas cópias: um .ttf, que é o que o motor do servidor sabe ler,
 * e o ficheiro original, que o browser usa no editor. Um .woff2 é convertido
 * à chegada, porque o motor não o lê.
 */

const EXTENSOES = ['ttf', 'otf', 'woff', 'woff2'];

export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('fonts')
    .select('id, name, weight, storage_path, web_path, created_at')
    .eq('user_id', user.id)
    .order('name');

  const linhas = data ?? [];
  const urls = await signedUrls(
    supabase,
    linhas.map((f) => f.web_path ?? f.storage_path).filter(Boolean) as string[],
    60 * 60 * 12,
  );

  return ok({
    fontes: linhas.map((f) => ({
      ...f,
      url: urls[(f.web_path ?? f.storage_path) as string] ?? null,
    })),
  });
});

export const POST = withUser(async ({ user, supabase, request }) => {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('Nenhum ficheiro recebido.');

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSOES.includes(ext)) {
    throw new Error('Só aceito .ttf, .otf, .woff ou .woff2.');
  }
  if (file.size > 6 * 1024 * 1024) throw new Error('Essa fonte é grande de mais (máximo 6 MB).');

  const nome =
    String(form.get('name') ?? '').trim() ||
    file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_](regular|normal|bold|black|light|medium|italic|\d{3})$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
  const peso = Number(form.get('weight') ?? 400) || 400;

  const original = Buffer.from(await file.arrayBuffer());

  // o motor do servidor não lê woff2 — converte-se à chegada
  let paraCompor = original;
  let extCompor = ext;
  if (ext === 'woff2') {
    const wawoff2 = await import('wawoff2');
    paraCompor = Buffer.from(await wawoff2.decompress(original));
    extCompor = 'ttf';
  }

  const base = `${crypto.randomUUID()}`;
  const caminhoCompor = userPath(user.id, 'fontes', `${base}.${extCompor}`);
  await uploadBuffer(supabase, caminhoCompor, paraCompor, 'font/ttf');

  let caminhoWeb: string | null = null;
  if (ext === 'woff2') {
    caminhoWeb = userPath(user.id, 'fontes', `${base}.woff2`);
    await uploadBuffer(supabase, caminhoWeb, original, 'font/woff2');
  }

  const { data, error } = await supabase
    .from('fonts')
    .insert({
      user_id: user.id,
      name: nome,
      weight: peso,
      storage_path: caminhoCompor,
      web_path: caminhoWeb,
    })
    .select('id, name, weight, storage_path, web_path, created_at')
    .single();
  if (error) throw new Error(error.message);

  const urls = await signedUrls(supabase, [caminhoWeb ?? caminhoCompor], 60 * 60 * 12);
  return ok({ fonte: { ...data, url: urls[caminhoWeb ?? caminhoCompor] ?? null } });
});
