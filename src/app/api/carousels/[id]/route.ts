import { ok, withUser } from '@/lib/api';
import { removeFiles, signedUrls } from '@/lib/storage';

export const runtime = 'nodejs';

export const GET = withUser(async ({ user, supabase, params }) => {
  const { data: carousel } = await supabase
    .from('carousels')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!carousel) throw new Error('Carrossel não encontrado.');

  const { data: slides } = await supabase
    .from('slides')
    .select('*')
    .eq('carousel_id', params.id)
    .order('idx');

  const urls = await signedUrls(
    supabase,
    (slides ?? []).map((s) => s.render_path).filter((p): p is string => !!p),
  );

  return ok({
    carousel,
    slides: (slides ?? []).map((s) => ({
      ...s,
      url: s.render_path ? urls[s.render_path] ?? null : null,
    })),
  });
});

/** Editar texto dos slides, legenda, hashtags ou a fotografia escolhida. */
export const PATCH = withUser(async ({ user, supabase, request, params }) => {
  const body = (await request.json()) as {
    title?: string;
    caption?: string;
    hashtags?: string;
    photo_id?: string | null;
    design?: unknown;
    slides?: Array<{ id: string; fields: Record<string, string> }>;
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.design !== undefined) patch.design = body.design;
  for (const key of ['title', 'caption', 'hashtags', 'photo_id'] as const) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  const { error } = await supabase
    .from('carousels')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  for (const slide of body.slides ?? []) {
    await supabase
      .from('slides')
      .update({ fields: slide.fields })
      .eq('id', slide.id)
      .eq('carousel_id', params.id);
  }

  return ok();
});

export const DELETE = withUser(async ({ user, supabase, params }) => {
  const { data: slides } = await supabase
    .from('slides')
    .select('render_path')
    .eq('carousel_id', params.id);

  const { error } = await supabase
    .from('carousels')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  await removeFiles(
    supabase,
    (slides ?? []).map((s) => s.render_path).filter((p): p is string => !!p),
  );
  return ok();
});
