import { redirect } from 'next/navigation';
import { Wizard } from '@/components/wizard';
import { GuiaDaPagina } from '@/components/guia';
import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { TrainFront } from 'lucide-react';
import { StatusPill } from '@/components/ui';
import { Saudacao } from '@/components/saudacao';

export const dynamic = 'force-dynamic';

async function count(table: string, userId: string) {
  const supabase = createClient();
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

export default async function Dashboard() {
  // A sessão pode ter expirado entre o layout e esta página.
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = createClient();

  const [carrosseis, fontes, fotos, templates] = await Promise.all([
    count('carousels', user.id),
    count('sources', user.id),
    count('photos', user.id),
    count('templates', user.id),
  ]);

  const { data: recentes } = await supabase
    .from('carousels')
    .select('id, title, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(6);

  const { data: fila } = await supabase
    .from('jobs')
    .select('id, type, status')
    .eq('user_id', user.id)
    .in('status', ['queued', 'running']);

  const stats = [
    { label: 'Carrosséis', value: carrosseis, href: '/carrosseis' },
    { label: 'Material', value: fontes, href: '/material' },
    { label: 'Fotografias', value: fotos, href: '/fotografias' },
    { label: 'Templates', value: templates, href: '/templates' },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-sand pb-5">
        <div>
          <Saudacao />
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            Escreve uma ideia e sai um carrossel completo — gancho, slides e legenda, prontos
            a publicar.
          </p>
        </div>
        <Link href="/criar" className="btn-primary">
          <TrainFront className="h-4 w-4" /> Carrossel Express
        </Link>
      </div>

      <GuiaDaPagina />

      <Wizard />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card transition hover:border-ink/30">
            <p className="text-3xl font-semibold">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      {!!fila?.length && (
        <div className="card mb-8 border-sand bg-creme">
          <p className="text-sm">
            <strong>{fila.length}</strong> trabalho(s) na fila. A geração corre em segundo plano —
            volta a esta página daqui a pouco ou abre{' '}
            <Link href="/carrosseis" className="underline">
              Carrosséis
            </Link>
            .
          </p>
        </div>
      )}

      <h2 className="mb-3 text-xl font-semibold tracking-tight">Últimos carrosséis</h2>
      {recentes?.length ? (
        <div className="divide-y divide-sand overflow-hidden rounded-2xl border border-sand bg-white">
          {recentes.map((c) => (
            <Link
              key={c.id}
              href={`/carrosseis/${c.id}`}
              className="flex items-center justify-between px-5 py-3 text-sm transition hover:bg-sand/40"
            >
              <span className="truncate pr-4">{c.title}</span>
              <StatusPill status={c.status} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-sand p-10 text-center text-sm text-muted">
          Ainda não há carrosséis. Começa por{' '}
          <Link href="/templates" className="underline">
            criar um template
          </Link>{' '}
          e depois gera um lote.
        </div>
      )}
    </>
  );
}
