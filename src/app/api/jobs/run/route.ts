import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, getUser } from '@/lib/supabase/server';
import { processJob, type JobRow } from '@/lib/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_ATTEMPTS = 3;

/**
 * Worker da fila.
 * Duas formas de chamar:
 *  - com sessão iniciada (a app chama sozinha enquanto tens páginas abertas)
 *  - com o header  x-jobs-secret: $JOBS_RUN_SECRET  (cron da Vercel)
 */
export async function POST(request: Request) {
  const expected = process.env.JOBS_RUN_SECRET;
  const secret =
    request.headers.get('x-jobs-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const isCron = !!expected && secret === expected;

  let userId: string | null = null;
  if (!isCron) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    userId = user.id;
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 3), 10);

  // Com service-role, a fila vê tudo — é o que o cron precisa.
  // Sem ela, trabalha com a sessão de quem tem a app aberta: as políticas de
  // acesso já limitam cada pessoa às suas próprias linhas, e a fábrica anda
  // sem essa chave estar configurada.
  const temServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  if (isCron && !temServiceRole) {
    return NextResponse.json(
      { error: 'A fila por cron precisa da SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 },
    );
  }
  const admin = temServiceRole ? createAdminClient() : (createClient() as never);

  let query = admin
    .from('jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (userId) query = query.eq('user_id', userId);

  const { data: jobs } = await query;
  if (!jobs?.length) return NextResponse.json({ processed: 0, remaining: 0 });

  const results: Array<{ id: string; type: string; ok: boolean; error?: string }> = [];

  for (const raw of jobs) {
    const job = raw as JobRow & { status: string };

    // claim: só avança quem conseguir marcar 'running'
    const { data: claimed } = await admin
      .from('jobs')
      .update({ status: 'running', attempts: job.attempts + 1, updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'queued')
      .select('id');
    if (!claimed?.length) continue;

    try {
      await processJob(admin, job);
      await admin
        .from('jobs')
        .update({ status: 'done', error: null, updated_at: new Date().toISOString() })
        .eq('id', job.id);
      results.push({ id: job.id, type: job.type, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      const giveUp = job.attempts + 1 >= MAX_ATTEMPTS;

      await admin
        .from('jobs')
        .update({
          status: giveUp ? 'failed' : 'queued',
          error: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (giveUp && job.carousel_id) {
        await admin
          .from('carousels')
          .update({ status: 'failed', error: message })
          .eq('id', job.carousel_id);
      }
      results.push({ id: job.id, type: job.type, ok: false, error: message });
    }
  }

  // fecha lotes concluídos
  const batchIds = Array.from(new Set(jobs.map((j) => j.batch_id).filter(Boolean)));
  for (const batchId of batchIds) {
    const { count } = await admin
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('batch_id', batchId)
      .in('status', ['queued', 'running']);
    if ((count ?? 0) === 0) {
      await admin.from('batches').update({ status: 'done' }).eq('id', batchId);
    }
  }

  let remainingQuery = admin
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .in('status', ['queued', 'running']);
  if (userId) remainingQuery = remainingQuery.eq('user_id', userId);
  const { count: remaining } = await remainingQuery;

  return NextResponse.json({ processed: results.length, results, remaining: remaining ?? 0 });
}

/** GET serve para o cron da Vercel, que só faz pedidos GET. */
export async function GET(request: Request) {
  return POST(request);
}
