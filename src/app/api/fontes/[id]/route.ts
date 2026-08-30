import { ok, withUser } from '@/lib/api';
import { removeFiles } from '@/lib/storage';

export const runtime = 'nodejs';

export const DELETE = withUser(async ({ user, supabase, params }) => {
  const { data: fonte } = await supabase
    .from('fonts')
    .select('storage_path, web_path')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!fonte) throw new Error('Fonte não encontrada.');

  const { error } = await supabase
    .from('fonts')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  await removeFiles(
    supabase,
    [fonte.storage_path, fonte.web_path].filter((p): p is string => !!p),
  );
  return ok({ removed: params.id });
});
