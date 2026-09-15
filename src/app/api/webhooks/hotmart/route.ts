import { NextResponse } from 'next/server';
import { createClienteDeVendas } from '@/lib/supabase/admin';
import { enderecoDaApp } from '@/lib/caminho';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * A Hotmart a avisar que alguém pagou.
 *
 * Compra aprovada → a pessoa ganha lugar na app e recebe o email para
 * escolher a palavra-passe. Devolução ou cancelamento → o lugar fecha-se,
 * sem apagar nada do que ela fez.
 *
 * Quem confirma que o aviso é mesmo da Hotmart é o hottok, que ela dá quando
 * se cria o webhook lá e que vive em HOTMART_HOTTOK. Sem ele não se responde
 * a ninguém — este endereço é público por obrigação.
 */

const CODIGO = process.env.CODIGO_VENDAS ?? 'HOTMART-AUTO';

/**
 * Quanto tempo dura o acesso de uma mensalidade paga.
 *
 * Trinta e cinco e não trinta: a Hotmart cobra ao dia certo mas o aviso pode
 * chegar umas horas depois, e um cartão que falha à terça costuma passar à
 * quinta. Cinco dias de folga evitam fechar a porta a quem afinal pagou.
 */
const DIAS = Number(process.env.DIAS_DE_ACESSO ?? 35);

const APROVA = new Set([
  'PURCHASE_APPROVED',
  'PURCHASE_COMPLETE',
  'SUBSCRIPTION_REACTIVATION',
]);

/**
 * O que fecha a porta.
 *
 * A assinatura cancelada é o caso da mensalidade que deixou de ser paga: a
 * Hotmart tenta cobrar, tenta outra vez, e quando desiste cancela — e é aí
 * que ela perde o acesso. Um pagamento só atrasado (PURCHASE_DELAYED, boleto
 * por pagar) não fecha nada: ainda vai a tempo.
 */
const RETIRA = new Set([
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_PROTEST',
  'PURCHASE_CANCELED',
  'PURCHASE_EXPIRED',
  'SUBSCRIPTION_CANCELLATION',
]);

/**
 * É a primeira vez que esta pessoa paga, ou é a mensalidade a renovar-se?
 *
 * Importa por causa do email. Quem paga pela primeira vez precisa de um link
 * para escolher a palavra-passe — sem ele fica com o lugar feito e sem
 * maneira de lá entrar. Quem está a renovar já tem conta, já tem
 * palavra-passe, e não precisa de nada: mandar-lhe um email de acesso todos
 * os meses é dizer-lhe, doze vezes por ano, que a conta dela é nova.
 *
 * A Hotmart numera as cobranças de uma assinatura. A primeira é a 1; daí para
 * cima são renovações. Uma compra única não traz número nenhum — e é sempre
 * primeira, porque não há segunda.
 *
 * Quando o número não vier onde é esperado, trata-se como primeira: o pior
 * que isso faz é um email a mais. O contrário — tratar uma primeira compra
 * como renovação — é uma pessoa que pagou e ficou à porta sem saber porquê.
 */
function primeiraCompra(corpo: Record<string, unknown>): boolean {
  const dados = (corpo.data ?? corpo) as Record<string, unknown>;
  const compra = (dados.purchase ?? {}) as Record<string, unknown>;
  const n = Number(compra.recurrence_number);
  return !Number.isFinite(n) || n <= 1;
}

/** É uma mensalidade ou uma compra única? Só as mensalidades levam prazo. */
function ehAssinatura(corpo: Record<string, unknown>): boolean {
  const dados = (corpo.data ?? corpo) as Record<string, unknown>;
  const compra = (dados.purchase ?? {}) as Record<string, unknown>;
  return Boolean(dados.subscription ?? compra.recurrence_number ?? compra.subscription_id);
}

/** Procura o email do comprador onde a Hotmart o costuma pôr. */
function emailDoComprador(corpo: Record<string, unknown>): { email?: string; nome?: string } {
  const dados = (corpo.data ?? corpo) as Record<string, unknown>;
  const comprador = (dados.buyer ?? dados.subscriber ?? {}) as Record<string, unknown>;

  const email =
    (comprador.email as string) ??
    (dados.email as string) ??
    ((corpo as Record<string, string>).email as string);

  const nome = (comprador.name as string) ?? (dados.name as string);
  return { email: email?.trim().toLowerCase(), nome: nome?.trim() };
}

export async function POST(request: Request) {
  const hottok = process.env.HOTMART_HOTTOK?.trim();
  if (!hottok) {
    return NextResponse.json({ error: 'Vendas automáticas por configurar.' }, { status: 503 });
  }

  const vindo =
    request.headers.get('x-hotmart-hottok') ?? request.headers.get('X-HOTMART-HOTTOK') ?? '';

  let corpo: Record<string, unknown> = {};
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Corpo ilegível.' }, { status: 400 });
  }

  // versões antigas mandam o hottok dentro do corpo
  const noCorpo = (corpo.hottok as string) ?? '';
  if (vindo !== hottok && noCorpo !== hottok) {
    return NextResponse.json({ error: 'Não reconheço quem me chamou.' }, { status: 401 });
  }

  const evento = String(corpo.event ?? corpo.status ?? '').toUpperCase();
  const { email, nome } = emailDoComprador(corpo);

  if (!email?.includes('@')) {
    return NextResponse.json({ ok: true, ignorado: 'sem email' });
  }

  // chave de serviço: os códigos de sistema deixaram de valer para o
  // browser, e um webhook fala com a base de dados como servidor
  const supabase = createClienteDeVendas();

  // ── deixou de pagar: fecha-se a porta ────────────
  if (RETIRA.has(evento)) {
    await supabase.rpc('suspender_por_compra', { c: CODIGO, e: email });
    return NextResponse.json({ ok: true, acao: 'suspenso', email });
  }

  if (!APROVA.has(evento)) {
    return NextResponse.json({ ok: true, ignorado: evento || 'evento desconhecido' });
  }

  // ── pagou: o lugar fica feito e o email sai ──────
  const { data: papel, error } = await supabase.rpc('resgatar_codigo', { c: CODIGO, e: email });
  if (error || !papel) {
    console.error('[hotmart] não deu para dar acesso:', error?.message);
    return NextResponse.json({ error: 'Não consegui dar o acesso.' }, { status: 500 });
  }

  // mensalidade: o acesso passa a ter prazo, e cada cobrança empurra-o para
  // a frente. Compra única fica sem prazo nenhum.
  let ate: string | null = null;
  if (ehAssinatura(corpo)) {
    const { data } = await supabase.rpc('renovar_acesso', {
      c: CODIGO,
      e: email,
      dias: DIAS,
    });
    ate = (data as string) ?? null;
  }

  // Renovação: o lugar foi empurrado para a frente e não há mais nada a
  // fazer. Ela já cá anda, já tem palavra-passe, e não dá por nada — que é
  // exactamente o que uma renovação deve ser.
  const primeira = primeiraCompra(corpo);
  if (!primeira) {
    return NextResponse.json({ ok: true, acao: 'renovado', email, papel, ate });
  }

  // Primeira compra: o link leva-a direita à escolha da palavra-passe.
  //
  // Sem o `next`, o link abria a sessão e largava-a na app com uma conta sem
  // palavra-passe nenhuma — funciona hoje e deixa-a fechada para fora
  // amanhã, quando voltar e não tiver o que escrever no formulário.
  const origem = enderecoDaApp(request);
  const { error: erroDoEmail } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origem}/auth/callback?next=/palavra-passe`,
      data: nome ? { full_name: nome } : undefined,
    },
  });

  if (erroDoEmail) {
    // o lugar está feito; ela entra pelo «enviem-me um link» do /login
    console.error('[hotmart] acesso dado, email não saiu:', erroDoEmail.message);
  }

  return NextResponse.json({
    ok: true,
    acao: 'acesso dado',
    email,
    papel,
    ate,
    email_enviado: !erroDoEmail,
  });
}

/** A Hotmart bate à porta para ver se o endereço existe. */
export async function GET() {
  const pronto = Boolean(process.env.HOTMART_HOTTOK?.trim());
  return NextResponse.json({ ok: true, pronto });
}
