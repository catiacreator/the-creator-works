import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';

export const runtime = 'nodejs';

/**
 * Volta a compor os PNGs deste carrossel.
 * ?step=image  → gera nova fotografia antes de compor
 * ?step=write  → reescreve tudo de novo
 */
export const POST = withUser(async ({ user, supabase, request, params }) => {
  const { searchParams } = new URL(request.url);
  const step = searchParams.get('step') ?? 'render';
  const settings = await getSettings(supabase, user.id);

  const type =
    step === 'write'
      ? 'write'
      : step === 'image'
        ? 'image'
        : settings.render_engine === 'canva'
          ? 'canva'
          : 'render';

  const { data: carousel } = await supabase
    .from('carousels')
    .select('id, topic')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!carousel) throw new Error('Carrossel não encontrado.');

  const { count } = await supabase
    .from('slides')
    .select('id', { count: 'exact', head: true })
    .eq('carousel_id', params.id);

  const { error } = await supabase.from('jobs').insert({
    user_id: user.id,
    carousel_id: params.id,
    type,
    payload: { slides_per: count || 7, prompt: carousel.topic ?? '' },
  });
  if (error) throw new Error(error.message);

  await supabase.from('carousels').update({ error: null }).eq('id', params.id);
  return ok({ queued: type });
});
