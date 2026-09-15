'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Images, Loader2, Trash2 } from 'lucide-react';
import {
  apagarCarrossel,
  meusCarrosseis,
  type CarrosselGuardado,
} from '@/snap/carrosseis';
import { migracaoEmFalta } from '@/lib/migracoes';

/**
 * Os Meus Carrosséis — o separador do Snap, do lado de cá.
 *
 * É a metade que faltava do guardar: sem sítio onde os ver outra vez,
 * guardar não era guardar, era escrever para uma gaveta fechada.
 */

function quando(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CarrosseisPage() {
  const [linhas, setLinhas] = useState<CarrosselGuardado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aApagar, setAApagar] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    meusCarrosseis()
      .then((l) => vivo && setLinhas(l))
      .catch((e) => {
        if (!vivo) return;
        // uma tabela que ainda não existe tem uma resposta própria: diz qual
        // é o ficheiro que falta correr, em vez do erro cru do Postgres
        setErro(migracaoEmFalta(e) ?? 'Não consegui ler os teus carrosséis.');
        setLinhas([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function apagar(id: string) {
    setAApagar(id);
    setErro(null);
    try {
      await apagarCarrossel(id);
      setLinhas((l) => (l ?? []).filter((x) => x.id !== id));
    } catch (e) {
      setErro(migracaoEmFalta(e) ?? 'Não consegui apagar esse carrossel.');
    } finally {
      setAApagar(null);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[22px] font-semibold text-snapTexto">Os meus carrosséis</h2>
        <p className="mt-0.5 text-[13px] font-light text-snapApagado">
          O que guardaste no Estúdio. Carrega num para o voltar a abrir.
        </p>
      </div>

      {erro && (
        <p className="mb-4 rounded-xl border border-snapBorda bg-snapSuave px-4 py-3 text-[13px] text-snapTexto">
          {erro}
        </p>
      )}

      {linhas === null && (
        <div className="flex items-center gap-2 py-10 text-[13px] text-snapApagado">
          <Loader2 className="h-4 w-4 animate-spin" />A carregar
        </div>
      )}

      {linhas?.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-snapBorda px-6 py-12 text-center">
          <Images className="mx-auto h-7 w-7 text-snapApagado/60" />
          <p className="mt-3 text-[14px] text-snapTexto">Ainda não guardaste nenhum.</p>
          <p className="mt-1 text-[13px] text-snapApagado">
            Escreve um no Drop Content, desenha-o no Estúdio, e carrega em Guardar.
          </p>
          <Link
            href="/snap/drop"
            className="mt-5 inline-flex rounded-full bg-snapDestaque px-4 py-2 text-[12.5px] font-medium text-snapSobreDestaque transition-opacity hover:opacity-90"
          >
            Ir ao Drop Content
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(linhas ?? []).map((c) => (
          <div
            key={c.id}
            className="group relative rounded-2xl border border-snapBorda bg-snapCartao p-4 transition-colors hover:border-snapDestaque/40"
          >
            <Link href={`/snap/estudio?c=${c.id}`} className="block pr-8">
              <p className="text-[14px] font-medium leading-snug text-snapTexto">{c.title}</p>
              <p className="mt-1.5 text-[12px] text-snapApagado">
                {c.carousel_data.length} slides · {quando(c.created_at)}
              </p>
            </Link>

            <button
              onClick={() => apagar(c.id)}
              disabled={aApagar === c.id}
              title="Apagar"
              aria-label={`Apagar ${c.title}`}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-snapApagado/50 opacity-0 transition-all hover:bg-snapSuave hover:text-snapTexto focus-visible:opacity-100 group-hover:opacity-100"
            >
              {aApagar === c.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
