import archiver from 'archiver';
import { PassThrough, Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { downloadBuffer } from '@/lib/storage';
import { carouselToPptx } from '@/lib/pptx';
import { defaultSpec } from '@/lib/render';
import type { TemplateSpec } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Descarrega um carrossel (ou um lote inteiro):
 *   /api/export/<carousel-id>                → .zip com os PNGs e a legenda
 *   /api/export/<batch-id>?tipo=lote         → o lote inteiro em .zip
 *   /api/export/<carousel-id>?formato=pptx   → .pptx editável, para importar no Canva
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const isBatch = searchParams.get('tipo') === 'lote';

  let query = supabase
    .from('carousels')
    .select('id, title, caption, hashtags')
    .eq('user_id', user.id);
  query = isBatch ? query.eq('batch_id', params.id) : query.eq('id', params.id);

  const { data: carousels } = await query;
  if (!carousels?.length) {
    return NextResponse.json({ error: 'Nada para exportar.' }, { status: 404 });
  }

  // ── PowerPoint: o caminho para o Canva com o texto editável ──
  if (searchParams.get('formato') === 'pptx') {
    const carousel = carousels[0];

    const { data: slideRows } = await supabase
      .from('slides')
      .select('idx, fields')
      .eq('carousel_id', carousel.id)
      .order('idx');

    const { data: full } = await supabase
      .from('carousels')
      .select('template_id, photo_id')
      .eq('id', carousel.id)
      .single();

    let spec: TemplateSpec = defaultSpec();
    if (full?.template_id) {
      const { data: tpl } = await supabase
        .from('templates')
        .select('spec')
        .eq('id', full.template_id)
        .maybeSingle();
      if (tpl?.spec) spec = tpl.spec as TemplateSpec;
    }

    let photo: Buffer | null = null;
    if (full?.photo_id) {
      const { data: ph } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('id', full.photo_id)
        .maybeSingle();
      if (ph?.storage_path) photo = await downloadBuffer(supabase, ph.storage_path);
    }

    const buffer = await carouselToPptx({
      spec,
      title: carousel.title ?? 'Carrossel',
      photo,
      slides: (slideRows ?? []).map((r) => ({
        fields: (r.fields ?? {}) as Record<string, string>,
      })),
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${slug(carousel.title ?? 'carrossel')}.pptx"`,
      },
    });
  }

  const archive = archiver('zip', { zlib: { level: 6 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  (async () => {
    try {
      for (const carousel of carousels) {
        const folder = slug(carousel.title) || carousel.id.slice(0, 8);

        const { data: slides } = await supabase
          .from('slides')
          .select('idx, render_path, fields')
          .eq('carousel_id', carousel.id)
          .order('idx');

        for (const slide of slides ?? []) {
          if (!slide.render_path) continue;
          const buffer = await downloadBuffer(supabase, slide.render_path);
          archive.append(buffer, {
            name: `${folder}/${String(slide.idx + 1).padStart(2, '0')}.png`,
          });
        }

        const legenda = [carousel.caption ?? '', '', carousel.hashtags ?? ''].join('\n').trim();
        archive.append(legenda, { name: `${folder}/legenda.txt` });
      }
      await archive.finalize();
    } catch (err) {
      archive.abort();
      passthrough.destroy(err as Error);
    }
  })();

  const filename = `${isBatch ? 'lote' : 'carrossel'}-${params.id.slice(0, 8)}.zip`;
  return new Response(Readable.toWeb(passthrough) as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function slug(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
