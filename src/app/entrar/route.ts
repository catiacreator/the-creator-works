import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DIAS_POR_PASSAGEM, carouselSnap, lerPassagem } from '@/lib/passagem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do CarouselSnap.
 *
 * Chega-se aqui vindo de lá, com um bilhete assinado no endereço:
 *
 *     /entrar?t=eyJlIjoi….9f86d081…&para=/criar-carrosseis
 *
 * O que acontece, por ordem, e a ordem importa:
 *
 * 1. **Confere-se a letra do bilhete.** Se a assinatura não bater, se estiver
 *    fora de horas ou mal formado, acaba aqui.
 * 2. **Gasta-se o bilhete.** O número fica na tabela `passagens`, e a mesma
 *    instrução que o guarda é a que decide se já lá estava. Um bilhete
 *    apanhado no histórico do browser não volta a abrir nada.
 * 3. **Dá-se o lugar.** O mesmo `resgatar_codigo` que a Hotmart e o Stripe já
 *    usavam, com o código desta porta.
 * 4. **Empurra-se o prazo sete dias.** É isto que faz a subscrição do
 *    CarouselSnap ser reconfirmada sozinha: quem continua a pagar volta a
 *    entrar por lá e o prazo renova-se; quem cancela vê a porta fechar-se
 *    dentro de uma semana, sem ninguém a ir fechar à mão.
 * 5. **Abre-se a sessão.** Sem email, sem palavra-passe, sem a pessoa dar por
 *    nada: um link mágico feito e resgatado aqui dentro, no mesmo pedido.
 *
 * A ordem é esta de propósito. O bilhete gasta-se ANTES de se dar o lugar,
 * para que dois pedidos ao mesmo tempo com o mesmo bilhete não entrem os
 * dois; e o lugar dá-se antes da sessão, para que a sessão que sai daqui já
 * encontre a porta aberta quando o middleware a vir no pedido seguinte.
 *
 * A quem chega com um bilhete que não presta não se explica qual das contas
 * falhou — dizer isso é ensinar a forjar o próximo. Vai tudo para o mesmo
 * sítio: a página que diz que se entra pelo CarouselSnap.
 */

const CODIGO = process.env.CODIGO_CAROUSELSNAP ?? 'CAROUSELSNAP-AUTO';

/** Para onde se manda quem não entra. Sempre o mesmo sítio, sempre sem detalhe. */
function naoEntra(origem: string, porque: string) {
  console.error('[passagem] recusada:', porque);
  return NextResponse.redirect(`${origem}/assinar?porta=1`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const segredo = process.env.PASSAGEM_SEGREDO?.trim();

  if (!segredo) {
    console.error('[passagem] PASSAGEM_SEGREDO por configurar');
    return NextResponse.redirect(`${origin}/assinar?porta=1`);
  }

  const bilhete = searchParams.get('t') ?? searchParams.get('token') ?? '';
  const leitura = lerPassagem(bilhete, segredo);
  if (!leitura.ok) return naoEntra(origin, leitura.porque);

  const { e: email, n: nome, j } = leitura.recado;

  // para onde ia a pessoa. Só caminhos desta app — um endereço completo aqui
  // dentro era uma maneira de usar a nossa porta para mandar alguém para
  // outro sítio qualquer
  const pedido = searchParams.get('para') ?? '/';
  const para = pedido.startsWith('/') && !pedido.startsWith('//') ? pedido : '/';

  const admin = createAdminClient();

  // ── 2. gastar o bilhete ──────────────────────────────────
  const { data: primeira, error: erroDoBilhete } = await admin.rpc('gastar_passagem', {
    c: CODIGO,
    bilhete: j,
    e: email,
  });
  if (erroDoBilhete) return naoEntra(origin, `gastar_passagem: ${erroDoBilhete.message}`);
  if (!primeira) return naoEntra(origin, 'bilhete já usado');

  // ── 3. dar o lugar ───────────────────────────────────────
  const { data: papel, error: erroDoLugar } = await admin.rpc('resgatar_codigo', {
    c: CODIGO,
    e: email,
  });
  if (erroDoLugar || !papel) {
    return naoEntra(origin, `resgatar_codigo: ${erroDoLugar?.message ?? 'sem papel'}`);
  }

  // ── 4. empurrar o prazo ──────────────────────────────────
  await admin.rpc('renovar_acesso', { c: CODIGO, e: email, dias: DIAS_POR_PASSAGEM });

  // ── 5. abrir a sessão ────────────────────────────────────
  // A conta pode ainda não existir aqui: quem comprou no CarouselSnap nunca
  // pôs os pés nesta app. Cria-se já confirmada — quem confirmou o email foi
  // o CarouselSnap, e é nele que estamos a confiar.
  const { error: erroDaConta } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: nome ? { full_name: nome } : undefined,
  });
  // "já existe" é o caso normal a partir da segunda vez
  if (erroDaConta && !/already|exists|registered/i.test(erroDaConta.message)) {
    return naoEntra(origin, `createUser: ${erroDaConta.message}`);
  }

  const { data: link, error: erroDoLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const hash = link?.properties?.hashed_token;
  if (erroDoLink || !hash) {
    return naoEntra(origin, `generateLink: ${erroDoLink?.message ?? 'sem token'}`);
  }

  // o link mágico é resgatado aqui mesmo, no mesmo pedido: nunca chega a sair
  // daqui, nunca vai parar a uma caixa de correio, nunca é visto por ninguém
  const supabase = createClient();
  const { error: erroDaSessao } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hash,
  });
  if (erroDaSessao) return naoEntra(origin, `verifyOtp: ${erroDaSessao.message}`);

  return NextResponse.redirect(`${origin}${para}`);
}

/** Para se ver, de fora, se a porta já está de pé. */
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'x-passagem': process.env.PASSAGEM_SEGREDO?.trim() ? 'pronta' : 'por-configurar',
      'x-origem': carouselSnap(),
    },
  });
}
