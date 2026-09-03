import { ok, withUser } from '@/lib/api';
import { acessoDe, eADona } from '@/lib/acesso';
import { pode, TODAS_AS_PERMISSOES, type Papel } from '@/lib/papeis';
import { carregarMatriz } from '@/lib/papeis-servidor';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/** Quem chama isto tem mesmo o papel para isso? */
async function exigir(
  supabase: SupabaseClient,
  user: User,
  permissao: 'ver-pessoas' | 'gerir-pessoas',
) {
  const acesso = await acessoDe(supabase, user.email);
  const matriz = await carregarMatriz(supabase);
  if (!pode(acesso?.papel, permissao, matriz)) {
    throw new Error('Não tens permissão para isto.');
  }
  return acesso!.papel as Papel;
}

export const GET = withUser(async ({ user, supabase }) => {
  await exigir(supabase, user, 'ver-pessoas');

  const { data, error } = await supabase
    .from('membros')
    .select(
      'id, email, nome, papel, ativo, convite_pendente, convidado_por, ultimo_acesso, created_at',
    )
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  // quem está a ver, e o que pode fazer: é o servidor que sabe isto, não a
  // página. Procurar-me a mim própria na lista falhava sempre que a linha
  // ainda não existisse — e era o que estava a esconder o botão de convidar.
  const acesso = await acessoDe(supabase, user.email);
  const matriz = await carregarMatriz(supabase);
  const permissoes = TODAS_AS_PERMISSOES.filter((p) => pode(acesso?.papel, p, matriz));

  return ok({
    membros: data ?? [],
    eu: { email: user.email, papel: acesso?.papel ?? null, permissoes },
    matriz,
  });
});

/** Convidar alguém. Basta o email — o lugar fica feito antes de ela entrar. */
export const POST = withUser(async ({ user, supabase, request }) => {
  await exigir(supabase, user, 'gerir-pessoas');
  const body = (await request.json()) as { email?: string; nome?: string; papel?: Papel };

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email.includes('@')) throw new Error('Escreve um email válido.');

  const { data, error } = await supabase
    .from('membros')
    .insert({
      email,
      nome: body.nome?.trim() || null,
      papel: body.papel ?? 'aluno',
      convidado_por: user.email,
      convite_pendente: true,
    })
    .select('id, email, nome, papel, ativo, convidado_por, ultimo_acesso, created_at')
    .single();

  if (error) {
    throw new Error(
      /duplicate|unique/i.test(error.message)
        ? 'Esse email já tem lugar.'
        : /row-level security/i.test(error.message)
          ? 'A base de dados não te reconhece como admin nesta conta. Entra com o email da dona da app.'
          : error.message,
    );
  }

  // 2. o convite propriamente dito: um email com um link que a leva a
  //    escolher a palavra-passe. Vai pelo caminho normal do login (link
  //    mágico), que não precisa da chave de serviço.
  const origem =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;

  const { error: erroDoEmail } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // sem parâmetros: o Supabase só aceita endereços que estejam na sua
      // lista, e é o `convite_pendente` que diz ao callback para onde a levar
      emailRedirectTo: `${origem}/auth/callback`,
    },
  });

  return ok({
    membro: data,
    convite_enviado: !erroDoEmail,
    aviso: erroDoEmail
      ? 'O lugar ficou feito, mas o email de convite não saiu: ' + erroDoEmail.message
      : null,
  });
});

/** Mudar o papel, ou suspender e retomar o acesso. */
export const PATCH = withUser(async ({ user, supabase, request }) => {
  await exigir(supabase, user, 'gerir-pessoas');
  const { id, papel, ativo } = (await request.json()) as {
    id?: string;
    papel?: Papel;
    ativo?: boolean;
  };
  if (!id) throw new Error('Falta dizer quem.');

  const { data: alvo } = await supabase.from('membros').select('email, papel').eq('id', id).single();

  // a app não pode ficar sem dono: ninguém se despromove nem se suspende
  if (alvo?.email?.toLowerCase() === user.email?.toLowerCase()) {
    throw new Error('Não podes mudar o teu próprio papel nem tirar-te o acesso.');
  }

  // e a dona é a dona: nem outro admin lhe pode tirar a cadeira
  if (eADona(alvo?.email)) {
    throw new Error('Esta é a conta dona da app. O papel dela não se muda daqui.');
  }

  // sem admin ativo ninguém volta a abrir esta página
  if ((papel && papel !== 'admin') || ativo === false) {
    const { count } = await supabase
      .from('membros')
      .select('id', { count: 'exact', head: true })
      .eq('papel', 'admin')
      .eq('ativo', true);
    if ((count ?? 0) <= 1 && alvo?.papel === 'admin') {
      throw new Error('Tem de ficar sempre um admin ativo.');
    }
  }

  const campos: Record<string, unknown> = {};
  if (papel) campos.papel = papel;
  if (ativo !== undefined) campos.ativo = ativo;

  const { error } = await supabase.from('membros').update(campos).eq('id', id);
  if (error) throw new Error(error.message);
  return ok();
});

export const DELETE = withUser(async ({ user, supabase, request }) => {
  await exigir(supabase, user, 'gerir-pessoas');
  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new Error('Falta dizer quem.');

  const { data: alvo } = await supabase.from('membros').select('email').eq('id', id).single();
  if (alvo?.email?.toLowerCase() === user.email?.toLowerCase()) {
    throw new Error('Não te podes remover a ti própria.');
  }
  if (eADona(alvo?.email)) {
    throw new Error('Esta é a conta dona da app. Não se remove.');
  }

  const { error } = await supabase.from('membros').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return ok();
});
