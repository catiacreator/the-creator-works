import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { acessoDe } from '@/lib/acesso';
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

/**
 * Para onde se manda quem não entra. Sempre o mesmo sítio, sempre sem detalhe.
 *
 * O detalhe existe — são sete razões diferentes — e não vai para a pessoa:
 * dizer-lhe qual das contas falhou é ensinar-lhe a forjar o bilhete seguinte.
 *
 * Mas também não pode ficar só nos registos do servidor, que é um sítio onde
 * a Cátia não vai. Ela carrega no botão do CarouselSnap, vê a página que diz
 * «a ligação já não serve», e essa frase é um palpite entre sete. Por isso o
 * motivo fica anotado, e aparece-lhe no cartão da porta, em Admin.
 *
 * O email só se anota quando a assinatura bateu. Antes disso o bilhete não é
 * de confiança, e um email que vem num bilhete forjado é um email que alguém
 * escolheu — guardá-lo era deixar qualquer pessoa escrever nesta tabela.
 *
 * Anotar nunca muda o que acontece a quem está à porta: se a anotação falhar,
 * falha em silêncio. Uma porta que se recusa a fechar porque não conseguiu
 * escrever no diário é pior do que uma porta sem diário nenhum.
 */
/**
 * Já está cá dentro?
 *
 * Isto nasceu de uma coisa que não fazia sentido nenhum e acontecia a toda a
 * hora: a pessoa entra pelo CarouselSnap, fica com a sessão aberta, carrega
 * no botão outra vez — e é atirada para a página de assinatura. Uma app que
 * ela tem aberta noutro separador, com sessão válida e lugar pago, a
 * dizer-lhe que se assina pelo CarouselSnap.
 *
 * O bilhete repetido é recusado, e bem: serve uma vez só, e isso é o que
 * impede que um endereço apanhado no histórico volte a abrir a porta.
 *
 * Mas a recusa do BILHETE não é razão para pôr fora quem já está DENTRO. São
 * duas perguntas diferentes, e a porta só estava a fazer a primeira. Quem
 * tem sessão aberta e lugar na tabela entra — não porque o bilhete valha,
 * mas porque ela já é de casa.
 *
 * Não abre excepção nenhuma: as duas condições são exactamente as que o
 * middleware exige em todos os outros pedidos desta app. Quem não as tiver
 * continua a ir para a página de assinatura como antes.
 */
async function jaEstaDentro(): Promise<boolean> {
  try {
    const user = await getUser();
    if (!user?.email) return false;
    const acesso = await acessoDe(createClient(), user.email);
    return Boolean(acesso?.ativo);
  } catch {
    return false;
  }
}

async function naoEntra(origem: string, porque: string, email?: string) {
  console.error('[passagem] recusada:', porque);

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      await createAdminClient().rpc('anotar_recusa', { porque, e: email ?? null });
    }
  } catch (e) {
    console.error('[passagem] não deu para anotar a recusa:', e);
  }

  if (await jaEstaDentro()) {
    console.log('[passagem] bilhete recusado, mas a sessão é de casa — segue');
    return NextResponse.redirect(`${origem}/`);
  }

  return NextResponse.redirect(`${origem}/assinar?porta=1`);
}

async function abrir(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const segredo = process.env.PASSAGEM_SEGREDO?.trim();

  // este é o motivo que mais custa a descobrir de fora: sem segredo, a porta
  // recusa toda a gente e a página diz «a ligação já não serve», que é falso
  if (!segredo) return naoEntra(origin, 'PASSAGEM_SEGREDO por configurar');

  const bilhete = searchParams.get('t') ?? searchParams.get('token') ?? '';
  const leitura = lerPassagem(bilhete, segredo);
  // sem email: a assinatura não bateu, e o que vem num bilhete desses é do
  // gosto de quem o escreveu
  if (!leitura.ok) return naoEntra(origin, leitura.porque);

  const { u: snap, n: nome, j } = leitura.recado;
  let email = leitura.recado.e;

  // para onde ia a pessoa. Só caminhos desta app — um endereço completo aqui
  // dentro era uma maneira de usar a nossa porta para mandar alguém para
  // outro sítio qualquer
  const pedido = searchParams.get('para') ?? '/';
  const para = pedido.startsWith('/') && !pedido.startsWith('//') ? pedido : '/';

  const admin = createAdminClient();

  // ── 2. gastar o bilhete ──────────────────────────────────
  const { data: primeira, error: erroDoBilhete } = await admin.rpc('gastar_bilhete', {
    c: CODIGO,
    numero: j,
    e: email,
  });
  if (erroDoBilhete) return naoEntra(origin, `gastar_bilhete: ${erroDoBilhete.message}`, email);
  if (!primeira) return naoEntra(origin, 'bilhete já usado', email);

  // ── 2b. quem é esta pessoa, se o CarouselSnap disser ─────
  //
  // O id do CarouselSnap é que diz quem ela é; o email é só um dado dela.
  // Quando o email muda de lá, o que NÃO pode mudar aqui é o id da conta do
  // Supabase — tudo o que é dela está preso a esse id, e criar outra conta
  // era perder-lhe a biblioteca, a memória e o briefing de uma vez.
  //
  // Por isso: renomeia-se a conta que já existe. E se a renomeação falhar,
  // para-se aqui em vez de continuar — continuar era abrir-lhe uma conta
  // vazia e deixá-la a pensar que perdeu tudo.
  if (snap) {
    const { data: conhecida } = await admin.rpc('ver_passagem', { c: CODIGO, snap });
    const antiga = (Array.isArray(conhecida) ? conhecida[0] : conhecida) as
      | { email: string; auth_id: string | null }
      | undefined;

    if (antiga?.email && antiga.email.toLowerCase() !== email) {
      const anterior = antiga.email.toLowerCase();

      // o id da conta: guardado, ou descoberto pelo email antigo
      let idDaConta = antiga.auth_id;
      if (!idDaConta) {
        const { data: procurada } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: anterior,
        });
        idDaConta = procurada?.user?.id ?? null;
      }

      if (!idDaConta) return naoEntra(origin, `mudou de email e não achei a conta de ${anterior}`, email);

      const { error: erroDoNome } = await admin.auth.admin.updateUserById(idDaConta, {
        email,
        email_confirm: true,
      });
      if (erroDoNome) return naoEntra(origin, `mudar email da conta: ${erroDoNome.message}`, email);

      const { data: renomeado } = await admin.rpc('renomear_membro', {
        c: CODIGO,
        snap,
        novo: email,
      });
      if (renomeado === false) {
        // o email novo já é de outra pessoa aqui — juntar as duas seria pior
        return naoEntra(origin, `email ${email} já pertence a outro membro`, email);
      }

      console.log(`[passagem] ${anterior} passou a ${email} (mesma conta)`);
    } else if (antiga?.email) {
      // é ela, e o email não mudou — usa-se o que está cá, para o resto do
      // caminho não depender de maiúsculas ou espaços do outro lado
      email = antiga.email.toLowerCase();
    }
  }

  // ── 3. dar o lugar ───────────────────────────────────────
  const { data: papel, error: erroDoLugar } = await admin.rpc('resgatar_codigo', {
    c: CODIGO,
    e: email,
  });
  if (erroDoLugar || !papel) {
    return naoEntra(origin, `resgatar_codigo: ${erroDoLugar?.message ?? 'sem papel'}`, email);
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
    return naoEntra(origin, `createUser: ${erroDaConta.message}`, email);
  }

  const { data: link, error: erroDoLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const hash = link?.properties?.hashed_token;
  if (erroDoLink || !hash) {
    return naoEntra(origin, `generateLink: ${erroDoLink?.message ?? 'sem token'}`, email);
  }

  // guarda quem é quem, a cada entrada e não só na primeira: é assim que as
  // linhas antigas vão ganhando o id sem ninguém as arranjar à mão
  await admin.rpc('ligar_passagem', {
    c: CODIGO,
    e: email,
    snap: snap ?? '',
    auth: link?.user?.id ?? null,
  });

  // o link mágico é resgatado aqui mesmo, no mesmo pedido: nunca chega a sair
  // daqui, nunca vai parar a uma caixa de correio, nunca é visto por ninguém
  const supabase = createClient();
  const { error: erroDaSessao } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hash,
  });
  if (erroDaSessao) return naoEntra(origin, `verifyOtp: ${erroDaSessao.message}`, email);

  return NextResponse.redirect(`${origin}${para}`);
}

/**
 * A porta, com rede por baixo.
 *
 * Tudo o que corre aqui dentro tem o seu erro tratado e o seu motivo
 * anotado — menos o que ninguém previu. E o que ninguém previu, numa rota do
 * Next, sai como uma página em branco: sem recado, sem rasto no cartão, sem
 * nada para dizer a quem está do outro lado. A pessoa carrega no botão e o
 * ecrã fica vazio.
 *
 * Isto apanha o que escapar. Não arranja a avaria — arranja o silêncio: a
 * pessoa vai para onde vai qualquer recusa, e o motivo fica escrito com hora,
 * que é o que permite arranjar a avaria a seguir.
 *
 * Uma porta que rebenta em silêncio é a pior de todas. Foi assim que o
 * `bilhete` ambíguo se escondeu um dia inteiro.
 */
export async function GET(request: Request) {
  try {
    return await abrir(request);
  } catch (e) {
    const { origin } = new URL(request.url);
    const recado = e instanceof Error ? `${e.message}` : String(e);
    return naoEntra(origin, `rebentou: ${recado}`);
  }
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
