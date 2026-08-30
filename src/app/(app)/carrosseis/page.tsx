'use client';

import Link from 'next/link';
import { Download, PenTool, Trash2, TrainFront, CheckSquare, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dialogo, Empty, PageHeader, StatusPill } from '@/components/ui';
import type { BatchRow, CarouselRow } from '@/lib/types';

export default function CarrosseisPage() {
  const [carousels, setCarousels] = useState<CarouselRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [escolhidos, setEscolhidos] = useState<Record<string, boolean>>({});
  const [aApagar, setAApagar] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [c, b] = await Promise.all([
      fetch(`/api/carousels${filter ? `?batch=${filter}` : ''}`).then((r) => r.json()),
      fetch('/api/batches').then((r) => r.json()),
    ]);
    setCarousels(c.carousels ?? []);
    setBatches(b.batches ?? []);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function apagar(ids: string[]) {
    setBusy(true);
    for (const id of ids) {
      await fetch(`/api/carousels/${id}`, { method: 'DELETE' });
    }
    setBusy(false);
    setAApagar(null);
    setEscolhidos({});
    load();
  }

  const marcados = Object.keys(escolhidos).filter((id) => escolhidos[id]);

  return (
    <>
      <PageHeader
        title="Carrosséis"
        subtitle="Tudo o que já fizeste. Abre um para o afinar, ou apaga daqui mesmo."
        action={
          filter ? (
            <a className="btn-primary" href={`/api/export/${filter}?tipo=lote`}>
              <Download className="h-4 w-4" /> Descarregar lote
            </a>
          ) : (
            <Link className="btn-primary" href="/criar">
              <TrainFront className="h-4 w-4" /> Carrossel Express
            </Link>
          )
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={filter === '' ? 'chip-on' : 'chip-off'}>
          Todos
        </button>
        {batches.map((b) => (
          <button
            key={b.id}
            onClick={() => setFilter(b.id)}
            className={filter === b.id ? 'chip-on' : 'chip-off'}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* ── ações em lote ─────────────────────────────── */}
      {marcados.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rosa/30 bg-white px-4 py-3 text-sm">
          <strong>{marcados.length} escolhidos</strong>
          <button
            className="inline-flex items-center gap-1.5 text-xs underline hover:text-rosa"
            onClick={() =>
              setEscolhidos(Object.fromEntries(carousels.map((c) => [c.id, true])))
            }
          >
            <CheckSquare className="h-3.5 w-3.5" /> Todos
          </button>
          <button
            className="inline-flex items-center gap-1.5 text-xs underline hover:text-rosa"
            onClick={() => setEscolhidos({})}
          >
            <Square className="h-3.5 w-3.5" /> Limpar
          </button>
          <button
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-rosa underline"
            onClick={() => setAApagar(marcados)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Apagar os escolhidos
          </button>
        </div>
      )}

      {carousels.length ? (
        <div className="divide-y divide-sand overflow-hidden rounded-2xl border border-sand bg-white">
          {carousels.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-creme/60"
            >
              <input
                type="checkbox"
                checked={!!escolhidos[c.id]}
                onChange={(e) => setEscolhidos({ ...escolhidos, [c.id]: e.target.checked })}
                className="h-4 w-4 shrink-0"
                aria-label={`Escolher ${c.title}`}
              />

              <Link href={`/carrosseis/${c.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.title}</p>
                {c.error && <p className="truncate text-xs text-rose-700">{c.error}</p>}
              </Link>

              <StatusPill status={c.status} />

              {/* atalhos, sem ter de abrir */}
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <Link
                  href={`/editor/${c.id}`}
                  className="rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
                  title="Abrir no editor"
                >
                  <PenTool className="h-4 w-4" />
                </Link>
                <a
                  href={`/api/export/${c.id}`}
                  className="rounded-lg p-1.5 text-muted transition hover:bg-creme hover:text-ink"
                  title="Descarregar PNGs"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setAApagar([c.id])}
                  className="rounded-lg p-1.5 text-muted transition hover:bg-rosaSuave hover:text-rosa"
                  title="Apagar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Nada por aqui ainda.</Empty>
      )}

      {aApagar && (
        <Dialogo
          titulo={
            aApagar.length === 1 ? 'Apagar este carrossel?' : `Apagar ${aApagar.length} carrosséis?`
          }
          texto="Vão-se os slides compostos e o texto. As fotografias ficam na tua biblioteca. Não há como voltar atrás."
          confirmar={aApagar.length === 1 ? 'Apagar' : `Apagar ${aApagar.length}`}
          perigo
          ocupado={busy}
          aoConfirmar={() => apagar(aApagar)}
          aoFechar={() => setAApagar(null)}
        />
      )}
    </>
  );
}
