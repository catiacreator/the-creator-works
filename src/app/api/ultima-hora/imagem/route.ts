import { ok, withUser } from '@/lib/api';
import { signedUrl, uploadBuffer, userPath } from '@/lib/storage';
import {
  cartaoDeNoticia,
  imagensDeBanco,
  imagensDoArtigo,
  type ImagemTrazida,
} from '@/lib/cartao-noticia';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * As imagens de um assunto da Última hora.
 *
 * Desenha a manchete na paleta dela e, a seguir, vai buscar fotografias ao
 * próprio artigo. Se o artigo não tiver que chegue, procura imagem de licença
 * livre sobre o mesmo assunto.
 *
 * Nada disto entra na biblioteca dela: fica marcado como efémero e só existe
 * para este carrossel. A biblioteca é das fotografias dela.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const { id, tipo } = (await request.json()) as { id: string; tipo?: 'cartao' | 'fonte' };
  if (!id) throw new Error('Falta o assunto.');

  const { data: assunto } = await supabase
    .from('hot_topics')
    .select('assunto, fonte, url, porque, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!assunto) throw new Error('Não encontrei esse assunto.');

  const paraGuardar: Array<{ buffer: Buffer; mime: string; nome: string; kind: string }> = [];

  if (tipo !== 'fonte') {
    paraGuardar.push({
      buffer: await cartaoDeNoticia({
        titulo: assunto.assunto,
        fonte: assunto.fonte,
        data: new Date(assunto.created_at).toLocaleDateString('pt-PT', {
          day: 'numeric',
          month: 'long',
        }),
      }),
      mime: 'image/png',
      nome: `${assunto.assunto} — manchete`,
      kind: 'efemera',
    });
  }

  // primeiro o que o artigo tem; é sempre o que está mais a propósito
  let trazidas: ImagemTrazida[] = assunto.url ? await imagensDoArtigo(assunto.url, 3) : [];

  // e só se não chegar é que se vai procurar imagem livre sobre o assunto
  if (trazidas.length < 3) {
    const procura = assunto.assunto.replace(/["']/g, '').slice(0, 90);
    const extra = await imagensDeBanco(procura, 3 - trazidas.length);
    trazidas = [...trazidas, ...extra];
  }

  for (const img of trazidas) {
    paraGuardar.push({
      buffer: img.buffer,
      mime: img.mime,
      nome: `${assunto.assunto} — ${img.origem}`,
      kind: 'efemera',
    });
  }

  if (!paraGuardar.length) {
    throw new Error('Não encontrei imagem nenhuma para este assunto.');
  }

  const photos = [];
  for (const item of paraGuardar) {
    const ext = item.mime.includes('png')
      ? 'png'
      : item.mime.includes('webp')
        ? 'webp'
        : item.mime.includes('gif')
          ? 'gif'
          : 'jpg';
    const caminho = userPath(user.id, 'efemeras', `${crypto.randomUUID()}.${ext}`);
    await uploadBuffer(supabase, caminho, item.buffer, item.mime);

    const { data, error } = await supabase
      .from('photos')
      .insert({
        user_id: user.id,
        kind: item.kind,
        storage_path: caminho,
        prompt: item.nome,
      })
      .select('id, kind, storage_path, prompt, width, height, tags, folder_id, created_at')
      .single();
    if (error) throw new Error(error.message);

    photos.push({ ...data, url: await signedUrl(supabase, caminho) });
  }

  return ok({ photos, doArtigo: trazidas.filter((t) => t.origem !== 'banco de imagens').length });
});
