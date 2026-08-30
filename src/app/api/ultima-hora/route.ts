import { ok, withUser } from '@/lib/api';
import { briefingParaTexto, type Briefing } from '@/lib/briefing';
import { procurarAssuntos, type Assunto } from '@/lib/ultima-hora';
import { REGIOES, type Regiao } from '@/lib/regioes';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** O que já foi encontrado, do mais recente para trás. */
export const GET = withUser(async ({ user, supabase, request }) => {
  const regiao = new URL(request.url).searchParams.get('regiao');

  let query = supabase
    .from('hot_topics')
    .select('id, categoria, assunto, fonte, url, porque, angulos, regiao, usado_em, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(40);

  if (regiao) query = query.eq('regiao', regiao);
  const { data } = await query;

  return ok({ assuntos: data ?? [] });
});

/** Vai à procura outra vez. Guarda o que encontrar e devolve só isso. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json().catch(() => ({}))) as {
    quantos?: number;
    regiao?: Regiao;
    modo?: 'nicho' | 'quentes';
    palavras?: string;
  };
  const quantos = Math.min(Math.max(body.quantos ?? 5, 1), 8);
  const regiao: Regiao = REGIOES.some((r) => r.id === body.regiao)
    ? (body.regiao as Regiao)
    : 'global';

  const { data: cfg } = await supabase
    .from('settings')
    .select('perfil, briefing')
    .eq('user_id', user.id)
    .maybeSingle();

  const briefing = (cfg?.briefing ?? {}) as Briefing;
  const nicho = [briefing.nicho, briefing.subnicho].filter(Boolean).join(' — ').trim();
  if (!nicho) {
    throw new Error(
      'Diz-me primeiro qual é o teu nicho, em Sobre mim. Sem isso vinha-te o mesmo que vem a toda a gente.',
    );
  }

  const encontrados = await procurarAssuntos({
    briefingTexto: briefingParaTexto(briefing) || cfg?.perfil || '',
    nicho,
    regiao,
    quantos,
    modo: body.modo === 'quentes' ? 'quentes' : 'nicho',
    palavras: body.palavras ?? null,
  });

  // fora o que já lá está: o mesmo assunto duas vezes não vale nada
  const { data: antigos } = await supabase
    .from('hot_topics')
    .select('assunto')
    .eq('user_id', user.id)
    .eq('regiao', regiao)
    .order('created_at', { ascending: false })
    .limit(60);

  const jaVistos = new Set((antigos ?? []).map((a) => a.assunto.toLowerCase().trim()));
  const novos = encontrados.filter((a: Assunto) => !jaVistos.has(a.assunto.toLowerCase().trim()));

  if (!novos.length) return ok({ assuntos: [], repetidos: encontrados.length });

  const { data, error } = await supabase
    .from('hot_topics')
    .insert(
      novos.map((a) => ({
        user_id: user.id,
        categoria: a.categoria,
        assunto: a.assunto,
        fonte: a.fonte ?? null,
        url: a.url ?? null,
        porque: a.porque,
        angulos: a.angulos ?? [],
        regiao,
      })),
    )
    .select('id, categoria, assunto, fonte, url, porque, angulos, regiao, usado_em, created_at');
  if (error) throw new Error(error.message);

  return ok({ assuntos: data ?? [], repetidos: encontrados.length - novos.length });
});

/** Deixa de interessar — sai da lista. */
export const DELETE = withUser(async ({ user, supabase, request }) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new Error('Falta o assunto a apagar.');

  const { error } = await supabase
    .from('hot_topics')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  return ok({ removed: id });
});
