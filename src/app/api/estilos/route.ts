import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

/** Os estilos do estúdio, guardados na conta para seguirem entre computadores. */
export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('settings')
    .select('studio_styles')
    .eq('user_id', user.id)
    .maybeSingle();

  return ok({ estilos: data?.studio_styles ?? [] });
});

export const PUT = withUser(async ({ user, supabase, request }) => {
  const { estilos } = (await request.json()) as { estilos: unknown[] };
  if (!Array.isArray(estilos)) throw new Error('Estilos inválidos.');

  const { error } = await supabase
    .from('settings')
    .upsert(
      { user_id: user.id, studio_styles: estilos, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw new Error(error.message);

  return ok({ estilos });
});
