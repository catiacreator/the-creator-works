import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { carregarMatriz } from '@/lib/papeis-servidor';
import { pode } from '@/lib/papeis';
import type { EstadoDasPaginas } from '@/lib/paginas';

export const runtime = 'nodejs';

export const GET = withUser(async ({ supabase }) => {
  const { data } = await supabase.from('paginas').select('caminho, escondida, manutencao');
  const estado: EstadoDasPaginas = {};
  for (const linha of data ?? []) estado[linha.caminho] = linha;
  return ok({ paginas: estado });
});

/** Esconder, pôr em manutenção, ou voltar a abrir. */
export const PATCH = withUser(async ({ user, supabase, request }) => {
  const acesso = await acessoDe(supabase, user.email);
  const matriz = await carregarMatriz(supabase);
  if (!pode(acesso?.papel, 'gerir-pessoas', matriz)) {
    throw new Error('Só a admin mexe nas páginas.');
  }

  const { caminho, escondida, manutencao } = (await request.json()) as {
    caminho?: string;
    escondida?: boolean;
    manutencao?: boolean;
  };
  if (!caminho) throw new Error('Falta dizer que página.');

  const { data, error } = await supabase
    .from('paginas')
    .upsert(
      {
        caminho,
        escondida: Boolean(escondida),
        manutencao: Boolean(manutencao),
        atualizado: new Date().toISOString(),
      },
      { onConflict: 'caminho' },
    )
    .select('caminho');

  if (error) {
    throw new Error(
      /row-level security/i.test(error.message)
        ? 'A base de dados não te reconhece como admin nesta conta. Entra com o email da dona da app.'
        : error.message,
    );
  }
  // uma escrita recusada pelas políticas não dá erro: não altera nada. Sem
  // esta verificação, ficava a parecer guardada.
  if (!data?.length) {
    throw new Error(
      'A base de dados não deixou guardar: esta conta não é reconhecida como admin.',
    );
  }

  return ok();
});
