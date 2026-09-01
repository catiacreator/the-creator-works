import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('campanhas')
    .select('id, nome, descricao, produto, inicio, fim, ativa')
    .eq('user_id', user.id)
    .order('inicio', { ascending: false });

  return ok({ campanhas: data ?? [] });
});

interface Corpo {
  id?: string;
  nome?: string;
  descricao?: string | null;
  produto?: string | null;
  inicio?: string;
  fim?: string;
  ativa?: boolean;
}

/** Cria ou actualiza — o `id` é que decide. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as Corpo;

  const nome = (body.nome ?? '').trim();
  if (!nome) throw new Error('A campanha precisa de nome.');
  if (!body.inicio || !body.fim) throw new Error('Faltam as datas de início e de fim.');
  if (body.fim < body.inicio) throw new Error('A data de fim é anterior à de início.');

  const campos = {
    nome,
    descricao: body.descricao?.trim() || null,
    produto: body.produto?.trim() || null,
    inicio: body.inicio,
    fim: body.fim,
    ativa: body.ativa ?? true,
  };

  const query = body.id
    ? supabase.from('campanhas').update(campos).eq('id', body.id).eq('user_id', user.id)
    : supabase.from('campanhas').insert({ ...campos, user_id: user.id });

  const { data, error } = await query
    .select('id, nome, descricao, produto, inicio, fim, ativa')
    .single();

  if (error) throw new Error(error.message);
  return ok({ campanha: data });
});

/** Ligar e desligar sem abrir o formulário. */
export const PATCH = withUser(async ({ user, supabase, request }) => {
  const { id, ativa } = (await request.json()) as { id?: string; ativa?: boolean };
  if (!id) throw new Error('Falta dizer qual.');

  const { error } = await supabase
    .from('campanhas')
    .update({ ativa: Boolean(ativa) })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  return ok();
});

export const DELETE = withUser(async ({ user, supabase, request }) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new Error('Falta dizer qual.');

  const { error } = await supabase.from('campanhas').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);
  return ok();
});
