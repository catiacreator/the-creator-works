import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * O Stripe a avisar que alguém pagou.
 *
 * Entra pela mesma porta que a Hotmart já usava: um código de sistema que só
 * vive no servidor, `resgatar_codigo` a dar o lugar e `renovar_acesso` a
 * empurrar o prazo. A diferença está em quem confirma que o aviso é mesmo do
 * Stripe — e aqui é preciso ter cuidado, porque este endereço é público por
 * obrigação e qualquer pessoa lhe pode bater à porta a dizer que pagou.
 *
 * O Stripe assina cada aviso. No cabeçalho `stripe-signature` vem o momento
 * em que foi enviado e uma ou mais assinaturas:
 *
 *     t=1699999999,v1=5257a869e7…,v1=…
 *
 * Cada `v1` é um HMAC-SHA256 de `t.corpo` com o segredo do webhook. Para
 * confirmar, refaz-se a conta e compara-se. Três cuidados:
 *
 * 1. O corpo tem de ser o texto **tal como chegou**. Passá-lo por JSON.parse
 *    e voltar a serializar muda espaços e ordem, e a assinatura deixa de bater.
 * 2. A comparação é feita em tempo constante. Um `===` normal desiste no
 *    primeiro byte diferente, e o tempo que demora a desistir diz a quem
 *    tenta adivinhar quantos bytes já acertou.
 * 3. O `t` tem de ser recente. Sem isso, um aviso verdadeiro apanhado hoje
 *    podia ser reenviado daqui a um ano para dar acesso outra vez.
 */

const CODIGO = process.env.CODIGO_VENDAS_STRIPE ?? 'STRIPE-AUTO';

/**
 * Quanto tempo dura o acesso de uma mensalidade paga.
 *
 * Trinta e cinco e não trinta: o Stripe cobra ao dia certo, mas um cartão que
 * falha à terça costuma passar à quinta — ele tenta de novo durante dias antes
 * de desistir. Cinco dias de folga evitam fechar a porta a quem afinal pagou.
 */
const DIAS = Number(process.env.DIAS_DE_ACESSO ?? 35);

/** Cinco minutos. É o que o Stripe recomenda, e chega para um servidor lento. */
const TOLERANCIA = 5 * 60;

/** Confere a assinatura. Devolve o motivo quando não bate, para o registo. */
function assinaturaValida(corpo: string, cabecalho: string, segredo: string): string | null {
  const partes = new Map<string, string[]>();
  for (const p of cabecalho.split(',')) {
    const [k, v] = p.split('=');
    if (!k || !v) continue;
    partes.set(k.trim(), [...(partes.get(k.trim()) ?? []), v.trim()]);
  }

  const t = partes.get('t')?.[0];
  const assinaturas = partes.get('v1') ?? [];
  if (!t || !assinaturas.length) return 'cabeçalho sem t ou v1';

  const idade = Math.floor(Date.now() / 1000) - Number(t);
  if (!Number.isFinite(idade) || Math.abs(idade) > TOLERANCIA) return 'aviso fora de horas';

  const esperada = createHmac('sha256', segredo).update(`${t}.${corpo}`, 'utf8').digest();

  // o Stripe manda mais do que uma assinatura quando o segredo está a ser
  // trocado: basta uma bater
  for (const a of assinaturas) {
    let recebida: Buffer;
    try {
      recebida = Buffer.from(a, 'hex');
    } catch {
      continue;
    }
    if (recebida.length === esperada.length && timingSafeEqual(recebida, esperada)) return null;
  }
  return 'assinatura não bate';
}

interface Objeto {
  [k: string]: unknown;
}

/** O email do cliente, onde quer que o Stripe o tenha posto desta vez. */
function emailDoCliente(o: Objeto): { email?: string; nome?: string } {
  const detalhes = (o.customer_details ?? {}) as Objeto;
  const email =
    (o.customer_email as string) ??
    (detalhes.email as string) ??
    (o.email as string) ??
    ((o.billing_details as Objeto)?.email as string);
  const nome = (detalhes.name as string) ?? (o.name as string);
  return { email: email?.trim().toLowerCase(), nome: nome?.trim() };
}

/** Pagou: dá lugar a quem ainda não tem, e empurra o prazo. */
const PAGOU = new Set([
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_succeeded',
  'customer.subscription.resumed',
]);

/**
 * Deixou de pagar.
 *
 * `invoice.payment_failed` não entra aqui de propósito: é a primeira tentativa
 * a falhar, e o Stripe ainda vai tentar mais vezes durante dias. Quem fecha a
 * porta é o fim da assinatura, e até lá os cinco dias de folga do prazo
 * seguram quem só se atrasou.
 */
const DEIXOU = new Set([
  'customer.subscription.deleted',
  'charge.refunded',
  'charge.dispute.created',
]);

export async function POST(request: Request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!segredo) {
    return NextResponse.json({ error: 'Mensalidades por configurar.' }, { status: 503 });
  }

  // o texto tal como chegou — assinar sobre outra coisa não daria o mesmo
  const corpo = await request.text();
  const cabecalho = request.headers.get('stripe-signature') ?? '';

  const porque = assinaturaValida(corpo, cabecalho, segredo);
  if (porque) {
    console.error('[stripe] aviso recusado:', porque);
    return NextResponse.json({ error: 'Não reconheço quem me chamou.' }, { status: 401 });
  }

  let evento: Objeto;
  try {
    evento = JSON.parse(corpo) as Objeto;
  } catch {
    return NextResponse.json({ error: 'Corpo ilegível.' }, { status: 400 });
  }

  const tipo = String(evento.type ?? '');
  const objeto = ((evento.data as Objeto)?.object ?? {}) as Objeto;
  const { email, nome } = emailDoCliente(objeto);

  if (!email?.includes('@')) {
    return NextResponse.json({ ok: true, ignorado: 'sem email' });
  }

  // chave de serviço: os códigos de sistema deixaram de valer para o
  // browser, e um webhook fala com a base de dados como servidor
  const supabase = createAdminClient();

  // ── deixou de pagar: fecha-se a porta ────────────
  if (DEIXOU.has(tipo)) {
    await supabase.rpc('suspender_por_compra', { c: CODIGO, e: email });
    return NextResponse.json({ ok: true, acao: 'suspenso', email });
  }

  if (!PAGOU.has(tipo)) {
    return NextResponse.json({ ok: true, ignorado: tipo || 'evento desconhecido' });
  }

  // Uma fatura de zero euros não é um pagamento: é um teste, um crédito, ou o
  // acerto de uma mudança de plano. Não abre porta nenhuma.
  const valor = Number(objeto.amount_paid ?? objeto.amount_total ?? 0);
  if (tipo.startsWith('invoice') && valor <= 0) {
    return NextResponse.json({ ok: true, ignorado: 'fatura de zero' });
  }

  // ── pagou: o lugar fica feito e o email sai ──────
  const { data: papel, error } = await supabase.rpc('resgatar_codigo', { c: CODIGO, e: email });
  if (error || !papel) {
    console.error('[stripe] não deu para dar acesso:', error?.message);
    return NextResponse.json({ error: 'Não consegui dar o acesso.' }, { status: 500 });
  }

  const { data: ate } = await supabase.rpc('renovar_acesso', { c: CODIGO, e: email, dias: DIAS });

  await supabase.rpc('marcar_stripe', {
    c: CODIGO,
    e: email,
    cliente: String(objeto.customer ?? ''),
    assinatura: String(objeto.subscription ?? objeto.id ?? ''),
  });

  // Já cá andava: renovou, e não há email nenhum a enviar. Só quem entra pela
  // primeira vez precisa de escolher a palavra-passe.
  const primeira = tipo === 'checkout.session.completed';
  let emailEnviado = false;
  if (primeira) {
    const origem = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
    const { error: erroDoEmail } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origem}/auth/callback`,
        data: nome ? { full_name: nome } : undefined,
      },
    });
    if (erroDoEmail) {
      // o lugar está feito; ela entra pela recuperação de palavra-passe
      console.error('[stripe] acesso dado, email não saiu:', erroDoEmail.message);
    }
    emailEnviado = !erroDoEmail;
  }

  return NextResponse.json({
    ok: true,
    acao: primeira ? 'acesso dado' : 'renovado',
    email,
    papel,
    ate: (ate as string) ?? null,
    email_enviado: emailEnviado,
  });
}

/** Para se ver, de fora, se isto já está de pé. */
export async function GET() {
  return NextResponse.json({ ok: true, pronto: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()) });
}
