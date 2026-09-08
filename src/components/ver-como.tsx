'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye } from 'lucide-react';
import { papelPorId, type Papel } from '@/lib/papeis';

/**
 * A faixa que aparece enquanto a admin está a ver a app pelos olhos de outro
 * papel. Está sempre à vista de propósito: o pior que podia acontecer era ela
 * esquecer-se e pensar que a app estava partida.
 */
export function VerComo({ papel }: { papel: Papel }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function sair() {
    setBusy(true);
    await fetch('/api/ver-como', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ papel: null }),
    });
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rosa/40 bg-rosaSuave/50 px-5 py-3">
      <Eye className="h-4 w-4 shrink-0 text-rosa" />
      <p className="min-w-0 flex-1 text-sm">
        Estás a ver a app como <strong>{papelPorId(papel).nome}</strong>. É só o que essa pessoa vê
        — o que ela não pode, tu também não vês daqui.
      </p>
      <button className="btn-ghost shrink-0 px-3 py-1.5 text-xs" onClick={sair} disabled={busy}>
        {busy ? 'A voltar…' : 'Voltar ao meu'}
      </button>
    </div>
  );
}
