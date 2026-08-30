'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Enquanto a app estiver aberta, vai puxando a fila.
 * Em produção podes (e deves) juntar um cron da Vercel a chamar
 * /api/jobs/run com o header x-jobs-secret, para o lote continuar
 * mesmo com o browser fechado.
 */
export function JobRunner() {
  const [remaining, setRemaining] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch('/api/jobs/run?limit=2', { method: 'POST' });
        const data = (await res.json()) as { processed?: number; remaining?: number };
        if (!alive) return;
        setRemaining(data.remaining ?? 0);
        if (data.processed) router.refresh();
        timer = setTimeout(tick, data.remaining ? 1500 : 12000);
      } catch {
        if (alive) timer = setTimeout(tick, 20000);
      }
    }

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [router]);

  if (!remaining) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs text-paper shadow-lg">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
      {remaining} na fila
    </div>
  );
}
