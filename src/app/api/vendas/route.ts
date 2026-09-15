import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { carregarMatriz } from '@/lib/papeis-servidor';
import { pode } from '@/lib/papeis';
import { enderecoDaApp } from '@/lib/caminho';

export const runtime = 'nodejs';

/** Como estão as vendas automáticas, para a página de Admin dizer o que falta. */
export const GET = withUser(async ({ user, supabase, request }) => {
  const acesso = await acessoDe(supabase, user.email);
  const matriz = await carregarMatriz(supabase);
  if (!pode(acesso?.papel, 'gerir-pessoas', matriz)) {
    throw new Error('Só a admin vê isto.');
  }

  const codigo = process.env.CODIGO_VENDAS ?? 'HOTMART-AUTO';
  const { data } = await supabase
    .from('codigos')
    .select('usos, ativo')
    .eq('codigo', codigo)
    .maybeSingle();

  const origem = enderecoDaApp(request);

  return ok({
    endereco: `${origem}/api/webhooks/hotmart`,
    ligado: Boolean(process.env.HOTMART_HOTTOK?.trim()),
    vendas: data?.usos ?? 0,
    codigo_ativo: data?.ativo ?? false,
  });
});
