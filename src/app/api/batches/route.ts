import { ok, withUser } from '@/lib/api';
import { splitIntoChunks } from '@/lib/extract';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('batches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return ok({ batches: data ?? [] });
});

/**
 * Cria um lote: N carrosséis de uma vez.
 * O material vem de fontes (PDF/DOCX/TXT/Drive) e/ou de uma lista de temas.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as {
    name?: string;
    template_id?: string;
    source_ids?: string[];
    topics?: string[];
    quantity?: number;
    slides_per?: number;
    photo_id?: string | null;
    mode?: 'texto' | 'ia';
    extra?: string | null;
  };

  const quantity = Math.min(Math.max(Number(body.quantity ?? 5), 1), 50);
  const slidesPer = Math.min(Math.max(Number(body.slides_per ?? 7), 3), 12);
  const topics = (body.topics ?? []).map((t) => t.trim()).filter(Boolean);
  const sourceIds = body.source_ids ?? [];

  if (!topics.length && !sourceIds.length) {
    throw new Error('Escolhe pelo menos uma fonte ou escreve pelo menos um tema.');
  }

  // ── material de origem ─────────────────────────────────────
  const briefs: Array<{ topic: string | null; sourceId: string | null; text: string | null }> = [];

  if (sourceIds.length) {
    const { data: sources } = await supabase
      .from('sources')
      .select('id, content')
      .in('id', sourceIds)
      .eq('user_id', user.id);

    const perSource = Math.max(1, Math.ceil(quantity / (sources?.length || 1)));
    for (const source of sources ?? []) {
      for (const chunk of splitIntoChunks(source.content, perSource)) {
        briefs.push({ topic: null, sourceId: source.id, text: chunk });
      }
    }
  }

  for (const topic of topics) {
    briefs.push({ topic, sourceId: null, text: null });
  }

  // ajusta ao número pedido (repete ciclicamente se faltar material)
  const finalBriefs = Array.from({ length: quantity }, (_, i) => briefs[i % briefs.length]);

  // ── lote ───────────────────────────────────────────────────
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .insert({
      user_id: user.id,
      name: body.name?.trim() || `Lote de ${new Date().toLocaleDateString('pt-PT')}`,
      template_id: body.template_id ?? null,
      source_ids: sourceIds,
      topics,
      quantity,
      slides_per: slidesPer,
      status: 'running',
      config: { photo_id: body.photo_id ?? null, extra: body.extra ?? null, mode: body.mode ?? null },
    })
    .select('*')
    .single();
  if (batchError) throw new Error(batchError.message);

  // ── carrosséis + trabalhos ─────────────────────────────────
  const rows = finalBriefs.map((brief, i) => ({
    user_id: user.id,
    batch_id: batch.id,
    template_id: body.template_id ?? null,
    source_id: brief.sourceId,
    photo_id: body.photo_id ?? null,
    topic: brief.topic,
    title: brief.topic?.slice(0, 80) || `${batch.name} — ${i + 1}`,
    status: 'draft' as const,
  }));

  const { data: carousels, error } = await supabase.from('carousels').insert(rows).select('id');
  if (error) throw new Error(error.message);

  await supabase.from('jobs').insert(
    (carousels ?? []).map((c, i) => ({
      user_id: user.id,
      batch_id: batch.id,
      carousel_id: c.id,
      type: 'write' as const,
      payload: {
        slides_per: slidesPer,
        source_text: finalBriefs[i]?.text ?? null,
        topic: finalBriefs[i]?.topic ?? null,
        extra: body.extra ?? null,
        ...(body.photo_id ? { photo_id: body.photo_id } : {}),
        ...(body.mode ? { mode: body.mode } : {}),
      },
    })),
  );

  return ok({ batch, created: carousels?.length ?? 0 });
});
