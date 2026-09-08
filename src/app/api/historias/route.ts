import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('historias')
    .select('id, titulo, historia, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return ok({ historias: data ?? [] });
});

/** Cria ou actualiza — o `id` é que decide. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as { id?: string; titulo?: string; historia?: string };

  const titulo = (body.titulo ?? '').trim();
  const historia = (body.historia ?? '').trim();
  if (!titulo) throw new Error('Dá-lhe um título — é por ele que a vais reconhecer.');
  if (historia.length < 20) throw new Error('Conta a história com mais detalhe.');

  const query = body.id
    ? supabase
        .from('historias')
        .update({ titulo, historia })
        .eq('id', body.id)
        .eq('user_id', user.id)
    : supabase.from('historias').insert({ user_id: user.id, titulo, historia });

  const { data, error } = await query.select('id, titulo, historia, created_at').single();
  if (error) throw new Error(error.message);
  return ok({ historia: data });
});

export const DELETE = withUser(async ({ user, supabase, request }) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new Error('Falta dizer qual.');

  const { error } = await supabase.from('historias').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);
  return ok();
});
