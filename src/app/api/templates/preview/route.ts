import { withUser } from '@/lib/api';
import { renderSlidePng, toDataUri } from '@/lib/render';
import { downloadBuffer } from '@/lib/storage';
import type { TemplateSpec } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Pré-visualização de um slide com o spec atual do editor. Devolve PNG. */
export const POST = withUser(async ({ supabase, request }) => {
  const body = (await request.json()) as {
    spec: TemplateSpec;
    fields?: Record<string, string>;
    idx?: number;
    total?: number;
    photo_path?: string | null;
    bg_path?: string | null;
  };

  const fields =
    body.fields ??
    Object.fromEntries(
      body.spec.boxes.map((b) => [
        b.key,
        b.key === 'titulo'
          ? 'O erro que te faz publicar todos os dias e não vender nada'
          : b.key === 'corpo'
            ? 'Publicar não é vender. Sem uma promessa clara no primeiro slide, o resto do carrossel não tem para onde ir.'
            : b.key === 'kicker'
              ? 'conteúdo que vende'
              : 'Comenta VENDER e envio-te o guião',
      ]),
    );

  let photoUri: string | null = null;
  if (body.photo_path) {
    photoUri = toDataUri(await downloadBuffer(supabase, body.photo_path));
  }
  let frameUri: string | null = null;
  if (body.bg_path) {
    frameUri = toDataUri(await downloadBuffer(supabase, body.bg_path));
  }

  const png = await renderSlidePng({
    spec: body.spec,
    fields,
    idx: body.idx ?? 0,
    total: body.total ?? 7,
    photoUri,
    frameUri,
  });

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  });
});
