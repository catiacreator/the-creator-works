import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';
import { conversa } from '@/lib/ia';
import { promptDaAnalise, type DadosDoPerfil } from '@/lib/analise-perfil';

export const runtime = 'nodejs';
export const maxDuration = 300;

export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('profile_analyses')
    .select('id, handle, dados, analise, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  return ok({ analises: data ?? [] });
});

export const POST = withUser(async ({ user, supabase, request }) => {
  const dados = (await request.json()) as DadosDoPerfil;
  if (!dados.handle?.trim()) throw new Error('Falta o @ do perfil.');

  const settings = await getSettings(supabase, user.id);
  const analise = await conversa({
    settings,
    historico: [{ role: 'user', content: promptDaAnalise(dados) }],
  });

  const { data, error } = await supabase
    .from('profile_analyses')
    .insert({
      user_id: user.id,
      handle: dados.handle.replace(/^@/, '').trim(),
      dados,
      analise,
    })
    .select('id, handle, dados, analise, created_at')
    .single();
  if (error) throw new Error(error.message);

  return ok({ analise: data });
});
