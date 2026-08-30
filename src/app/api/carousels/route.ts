import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

export const GET = withUser(async ({ user, supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get('batch');

  let query = supabase
    .from('carousels')
    .select('id, title, topic, status, error, batch_id, template_id, photo_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (batchId) query = query.eq('batch_id', batchId);

  const { data } = await query;
  return ok({ carousels: data ?? [] });
});

/** Cria um carrossel avulso e mete-o na fila. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as {
    topic?: string;
    template_id?: string;
    source_id?: string;
    photo_id?: string;
    slides_per?: number;
    extra?: string;
    mode?: 'texto' | 'ia';
    /** texto deste carrossel, quando vem de um documento dividido */
    source_text?: string;
    /** slides já escritos — vêm da conversa com a Cát.IA */
    slides?: Array<{ fields: Record<string, string> }>;
    caption?: string;
    hashtags?: string;
    /** desenho feito à mão no editor — guarda como rascunho, sem fila */
    design?: unknown;
    title?: string;
  };

  // Já vem escrito da Cát.IA: grava os slides e manda compor, sem passar pela escrita.
  if (body.slides?.length) {
    const { data: carousel, error } = await supabase
      .from('carousels')
      .insert({
        user_id: user.id,
        template_id: body.template_id ?? null,
        photo_id: body.photo_id ?? null,
        title: (body.title ?? body.topic ?? '').trim() || 'Carrossel da Cát.IA',
        topic: body.topic ?? null,
        caption: body.caption ?? null,
        hashtags: body.hashtags ?? null,
        status: 'draft',
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await supabase.from('slides').insert(
      body.slides.map((s, idx) => ({ carousel_id: carousel.id, idx, fields: s.fields })),
    );

    await supabase.from('jobs').insert({
      user_id: user.id,
      carousel_id: carousel.id,
      type: 'render',
      payload: {},
    });

    return ok({ carousel });
  }

  // Rascunho do editor: guarda o desenho e fica por aqui.
  if (body.design) {
    const { data, error } = await supabase
      .from('carousels')
      .insert({
        user_id: user.id,
        title: (body.title ?? '').trim() || 'Rascunho sem nome',
        status: 'draft',
        design: body.design,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return ok({ carousel: data });
  }

  const { data: carousel, error } = await supabase
    .from('carousels')
    .insert({
      user_id: user.id,
      template_id: body.template_id ?? null,
      source_id: body.source_id ?? null,
      photo_id: body.photo_id ?? null,
      topic: body.topic ?? null,
      title: body.topic?.slice(0, 80) || 'Novo carrossel',
      status: 'draft',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await supabase.from('jobs').insert({
    user_id: user.id,
    carousel_id: carousel.id,
    type: 'write',
    payload: {
      slides_per: body.slides_per ?? 7,
      extra: body.extra ?? null,
      ...(body.photo_id ? { photo_id: body.photo_id } : {}),
      ...(body.mode ? { mode: body.mode } : {}),
      ...(body.source_text ? { source_text: body.source_text } : {}),
    },
  });

  return ok({ carousel });
});
