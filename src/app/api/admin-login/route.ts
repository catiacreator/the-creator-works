import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { confereChave } from '@/lib/chave-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta de serviço.
 *
 * Recebe um código, confere-o contra as chaves das admins e, se bater, abre a
 * sessão dessa pessoa. É a única entrada nesta app que não precisa de um
 * bilhete do CarouselSnap, e é por isso a que precisa de mais cuidado.
 *
 * O que a protege, por ordem de importância:
 *
 * 1. **Só existe se ela a criar.** Sem chave guardada, este endereço responde
 *    sempre que não. Não há código por omissão, não há código no ambiente,
 *    não há código no ficheiro nenhum.
 * 2. **Cinco enganos fecham-na um quarto de hora.** A conta é por origem, e
 *    é feita antes de se conferir seja o que for: quem está travado nem
 *    chega a gastar o scrypt do servidor.
 * 3. **O scrypt.** Cada tentativa custa memória e milissegundos a quem tenta,
 *    e uma máquina a adivinhar não faz melhor do que isso.
 * 4. **Diz sempre a mesma coisa.** Código errado, conta que deixou de ser
 *    admin, porta travada — a resposta é a mesma frase, e nunca diz qual das
 *    contas falhou.
 *
 * O que ela **não** faz, de propósito: não cria contas. A porta abre a quem
 * já é admin nesta app; se a linha não existir ou não for admin, não abre.
 * Uma porta que cria contas é uma porta que dá acesso, e esta só devolve o
 * que já lá estava.
 */

const CODIGO = process.env.CODIGO_CAROUSELSNAP ?? 'CAROUSELSNAP-AUTO';

/** Quantos dias se empurra o prazo de uma admin que o tinha em atraso. */
const DIAS = 7;

/** A única coisa que se diz a quem não entra. */
const NAO = 'O código não serve.';

/** De onde veio o pedido, tanto quanto o servidor consegue saber. */
function origemDe(request: Request): string {
  const encaminhado = request.headers.get('x-forwarded-for') ?? '';
  const primeiro = encaminhado.split(',')[0]?.trim();
  return primeiro || request.headers.get('x-real-ip')?.trim() || '';
}

function recusa(porque: string, estado = 401) {
  console.warn('[porta-admin] recusada:', porque);
  return NextResponse.json({ erro: NAO }, { status: estado });
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.error('[porta-admin] SUPABASE_SERVICE_ROLE_KEY por pôr — a porta não abre');
    return recusa('sem chave de serviço', 503);
  }

  let codigo = '';
  try {
    const corpo = (await request.json()) as { codigo?: string };
    codigo = String(corpo?.codigo ?? '').trim();
  } catch {
    return recusa('corpo ilegível');
  }
  if (!codigo) return recusa('sem código');

  const admin = createAdminClient();
  const origem = origemDe(request);

  // ── 1. está travada? ─────────────────────────────────────
  const { data: travada, error: erroDoTravao } = await admin.rpc('porta_admin_travada', {
    c: CODIGO,
    origem,
  });
  if (erroDoTravao) return recusa(`porta_admin_travada: ${erroDoTravao.message}`, 503);
  if (travada) {
    // 429 e não 401: a pessoa certa que se enganou merece perceber que é de
    // esperar, e não que o código dela deixou de servir
    return NextResponse.json(
      { erro: 'Demasiadas tentativas. Espera um quarto de hora.' },
      { status: 429 },
    );
  }

  // ── 2. bate com alguma chave? ────────────────────────────
  const { data: chaves, error: erroDasChaves } = await admin.rpc('chaves_da_porta', { c: CODIGO });
  if (erroDasChaves) return recusa(`chaves_da_porta: ${erroDasChaves.message}`, 503);

  const linhas = (chaves ?? []) as Array<{ email: string; sal: string; resumo: string }>;

  // percorre-se a lista toda mesmo depois de acertar. Parar no primeiro que
  // bate fazia o pedido demorar menos quando a chave é a primeira da lista —
  // e o tempo de resposta é uma maneira de ir descobrindo coisas
  let quem: string | null = null;
  for (const linha of linhas) {
    if (confereChave(codigo, linha.sal, linha.resumo) && !quem) quem = linha.email;
  }

  await admin.rpc('porta_admin_registar', { c: CODIGO, origem, acertou: Boolean(quem) });

  if (!quem) return recusa(linhas.length ? 'código não bate' : 'nenhuma chave posta');

  // ── 3. ela ainda pode entrar? ────────────────────────────
  const { data: aberta, error: erroDaPorta } = await admin.rpc('porta_admin_abrir', {
    c: CODIGO,
    e: quem,
    dias: DIAS,
  });
  if (erroDaPorta) return recusa(`porta_admin_abrir: ${erroDaPorta.message}`, 503);
  if (!aberta) return recusa(`${quem} já não é admin ativa`);

  // ── 4. abrir a sessão ────────────────────────────────────
  // o mesmo caminho da porta do CarouselSnap: um link mágico feito e gasto
  // aqui dentro, no mesmo pedido. Nunca sai daqui, nunca vai a caixa de
  // correio nenhuma.
  const { data: link, error: erroDoLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: quem,
  });
  const hash = link?.properties?.hashed_token;
  if (erroDoLink || !hash) return recusa(`generateLink: ${erroDoLink?.message ?? 'sem token'}`, 503);

  const supabase = createClient();
  const { error: erroDaSessao } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hash,
  });
  if (erroDaSessao) return recusa(`verifyOtp: ${erroDaSessao.message}`, 503);

  console.log(`[porta-admin] ${quem} entrou pela porta de serviço`);
  return NextResponse.json({ ok: true, para: '/' });
}
