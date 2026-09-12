import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { inventarCodigo, prepararChave, queixaDoCodigo } from '@/lib/chave-admin';

export const runtime = 'nodejs';

/**
 * A chave da porta de serviço, do lado de quem a põe.
 *
 * Só mexe na chave de quem está a chamar: o email nunca vem do pedido, vem da
 * sessão, e as funções do Supabase confirmam-no outra vez do lado de lá. Uma
 * admin não põe chave na conta de outra.
 *
 * O que sai daqui nunca inclui o código: nem a guardar, nem a ler. A única
 * vez em que ele existe fora da cabeça dela é na resposta ao POST que o
 * inventa, e mesmo essa é para ela o copiar — ninguém o volta a ver.
 */

async function exigirAdmin(supabase: Parameters<typeof acessoDe>[0], email?: string | null) {
  const acesso = await acessoDe(supabase, email);
  if (acesso?.papel !== 'admin') throw new Error('Só a admin tem porta de serviço.');
}

/** Como está a porta: se há chave, de quando é, e quem andou a tentar. */
export const GET = withUser(async ({ user, supabase }) => {
  await exigirAdmin(supabase, user.email);

  const { data, error } = await supabase.rpc('ver_chave_admin');
  if (error) throw new Error(error.message);

  const linha = (Array.isArray(data) ? data[0] : data) as
    | { tem: boolean; criada_em: string | null; ultimo_uso: string | null; erros_hoje: number }
    | undefined;

  return ok({
    tem: Boolean(linha?.tem),
    criada_em: linha?.criada_em ?? null,
    ultimo_uso: linha?.ultimo_uso ?? null,
    erros_hoje: Number(linha?.erros_hoje ?? 0),
  });
});

/**
 * Pôr ou trocar a chave.
 *
 * Sem código no corpo, inventa-se um — é o caminho recomendado, porque um
 * código inventado aqui tem cerca de 114 bits e nenhum código pensado por uma
 * pessoa tem. O código volta na resposta uma única vez.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  await exigirAdmin(supabase, user.email);

  const corpo = (await request.json().catch(() => ({}))) as { codigo?: string };
  const escolhido = String(corpo?.codigo ?? '').trim();
  const codigo = escolhido || inventarCodigo();

  const queixa = queixaDoCodigo(codigo);
  if (queixa) throw new Error(queixa);

  const { sal, resumo } = prepararChave(codigo);
  const { data, error } = await supabase.rpc('guardar_chave_admin', { sal, resumo });
  if (error) throw new Error(error.message);
  if (data === false) throw new Error('Não deu para guardar a chave.');

  // a única vez que o código sai daqui. Não fica guardado em lado nenhum —
  // se ela o perder, põe outro
  return ok({ ok: true, codigo });
});

/** Fechar a porta. */
export const DELETE = withUser(async ({ user, supabase }) => {
  await exigirAdmin(supabase, user.email);

  const { error } = await supabase.rpc('apagar_chave_admin');
  if (error) throw new Error(error.message);
  return ok({ ok: true });
});
