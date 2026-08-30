import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

export const GET = withUser(async ({ user, supabase, params }) => {
  const { data } = await supabase
    .from('sources')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) throw new Error('Fonte não encontrada.');
  return ok({ source: data });
});

export const DELETE = withUser(async ({ user, supabase, params }) => {
  const { error } = await supabase
    .from('sources')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  return ok();
});
