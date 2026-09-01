import { ok, withUser } from '@/lib/api';
import type { TipoDeMemoria } from '@/lib/memoria';

export const runtime = 'nodejs';

/** Tudo o que a Cát.IA sabe, das regras para baixo. */
export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('memorias')
    .select('id, tipo, conteudo, importancia, origem, created_at')
    .eq('user_id', user.id)
    .order('importancia', { ascending: false })
    .order('created_at', { ascending: false });

  return ok({ memorias: data ?? [] });
});

/**
 * Escrever uma memória.
 * As regras entram sempre com importância 5 — são ordens, não sugestões.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as {
    tipo?: TipoDeMemoria;
    conteudo?: string;
    importancia?: number;
    origem?: string;
  };

  const conteudo = (body.conteudo ?? '').trim();
  if (conteudo.length < 10) {
    throw new Error('Escreve a regra com mais detalhe — assim é curta demais.');
  }

  const tipo = body.tipo ?? 'regra';
  const { data, error } = await supabase
    .from('memorias')
    .insert({
      user_id: user.id,
      tipo,
      conteudo,
      importancia: tipo === 'regra' ? 5 : (body.importancia ?? 3),
      origem: body.origem ?? 'manual',
    })
    .select('id, tipo, conteudo, importancia, origem, created_at')
    .single();

  if (error) throw new Error(error.message);
  return ok({ memoria: data });
});

/** Apaga uma memória (?id=) ou esquece tudo (?tudo=1). */
export const DELETE = withUser(async ({ user, supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const tudo = searchParams.get('tudo');

  if (tudo) {
    const { error } = await supabase.from('memorias').delete().eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return ok();
  }

  if (!id) throw new Error('Falta dizer qual.');
  const { error } = await supabase.from('memorias').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);
  return ok();
});
