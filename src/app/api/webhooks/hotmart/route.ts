import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

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
    console.error('[hotmart] acesso dado, email não saiu:', erroDoEmail.message);
  }

  return NextResponse.json({
    ok: true,
    acao: 'acesso dado',
    email,
    papel,
    email_enviado: !erroDoEmail,
  });
}

/** A Hotmart bate à porta para ver se o endereço existe. */
export async function GET() {
  const pronto = Boolean(process.env.HOTMART_HOTTOK?.trim());
  return NextResponse.json({ ok: true, pronto });
}
