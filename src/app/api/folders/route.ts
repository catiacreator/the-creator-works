import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

export type FolderKind = 'foto' | 'carrossel';

/** Lista as pastas de um tipo: /api/folders?tipo=foto */
export const GET = withUser(async ({ user, supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get('tipo') ?? 'foto') as FolderKind;

  const { data } = await supabase
    .from('folders')
    .select('id, kind, name, created_at')
    .eq('user_id', user.id)
    .eq('kind', kind)
    .order('name');

  return ok({ folders: data ?? [] });
});

/** Cria uma pasta. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as { name?: string; tipo?: FolderKind };
  const name = (body.name ?? '').trim();
  if (!name) throw new Error('Dá um nome à pasta.');

  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: user.id, kind: body.tipo ?? 'foto', name })
    .select('id, kind, name, created_at')
    .single();

  if (error) {
    throw new Error(
      /duplicate|unique/i.test(error.message) ? 'Já tens uma pasta com esse nome.' : error.message,
    );
  }
  return ok({ folder: data });
});
