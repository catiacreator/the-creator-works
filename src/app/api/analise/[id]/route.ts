import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

export const DELETE = withUser(async ({ user, supabase, params }) => {
  const { error } = await supabase
    .from('profile_analyses')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  return ok({ removed: params.id });
});
