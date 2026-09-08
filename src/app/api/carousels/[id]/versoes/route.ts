import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

/** As versões guardadas deste carrossel, da mais recente para trás. */
export const GET = withUser(async ({ user, supabase, params }) => {
  const { data, error } = await supabase
    .from('carrossel_versoes')
    .select('id, title, motivo, created_at')
    .eq('carousel_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);

  return ok({ versoes: data ?? [] });
});

/**
 * Repor uma versão.
 *
 * Repor é também uma alteração, e das que mais assustam — por isso o que está
 * lá agora é guardado primeiro. Enganares-te a voltar atrás tem volta.
 */
export const POST = withUser(async ({ user, supabase, request, params }) => {
  const { versaoId } = (await request.json()) as { versaoId?: string };
  if (!versaoId) throw new Error('Falta dizer que versão repor.');

  const { data: versao } = await supabase
    .from('carrossel_versoes')
    .select('design, title')
    .eq('id', versaoId)
    .eq('carousel_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!versao) throw new Error('Essa versão já não existe.');

  const { data: atual } = await supabase
    .from('carousels')
    .select('design, title')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!atual) throw new Error('Carrossel não encontrado.');

  if (atual.design) {
    await supabase.from('carrossel_versoes').insert({
      carousel_id: params.id,
      user_id: user.id,
      title: atual.title,
      design: atual.design,
      motivo: 'antes de repor',
    });
  }

  const { data: reposto, error } = await supabase
    .from('carousels')
    .update({
      design: versao.design,
      title: versao.title ?? atual.title,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id, title, design')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!reposto) throw new Error('A base de dados não deixou repor esta versão.');

  return ok({ carousel: reposto });
});
