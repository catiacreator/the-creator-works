import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

/** Muda o nome da pasta. */
export const PATCH = withUser(async ({ user, supabase, request, params }) => {
  const body = (await request.json()) as { name?: string };
  const name = (body.name ?? '').trim();
  if (!name) throw new Error('O nome não pode ficar vazio.');

  const { data, error } = await supabase
    .from('folders')
    .update({ name })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id, kind, name, created_at')
    .single();

  if (error) {
    throw new Error(
      /duplicate|unique/i.test(error.message) ? 'Já tens uma pasta com esse nome.' : error.message,
    );
  }
  return ok({ folder: data });
});

/**
 * Apaga a pasta. O que está lá dentro não se perde — fica sem pasta
 * (a chave estrangeira está declarada com `on delete set null`).
 */
export const DELETE = withUser(async ({ user, supabase, params }) => {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  return ok({ removed: params.id });
});
