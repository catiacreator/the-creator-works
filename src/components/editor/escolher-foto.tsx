'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { PhotoRow } from '@/lib/types';

type Foto = PhotoRow & { url: string | null };

/** A biblioteca de Fotografias, numa janela, para escolher sem sair do editor. */
export function EscolherFoto({
  aoEscolher,
  aoFechar,
}: {
  aoEscolher: (foto: { id: string; url: string }) => void;
  aoFechar: () => void;
}) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [pastas, setPastas] = useState<Array<{ id: string; name: string }>>([]);
  const [pasta, setPasta] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    (async () => {
      const [f, p] = await Promise.all([
        fetch('/api/photos').then((r) => r.json()),
        fetch('/api/folders?tipo=foto').then((r) => r.json()),
      ]);
      setFotos(f.photos ?? []);
      setPastas(p.folders ?? []);
      setACarregar(false);
    })();
  }, []);

  const visiveis = pasta ? fotos.filter((f) => f.folder_id === pasta) : fotos;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <div className="cartao w-full max-w-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold text-edTexto">Biblioteca de fotografias</h2>
          <button
            onClick={aoFechar}
            className="ml-auto rounded-full p-1.5 text-edSuave transition hover:bg-edFundo hover:text-edTexto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {pastas.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => setPasta(null)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                pasta === null
                  ? 'bg-rosa text-white'
                  : 'border border-edLinha text-edSuave hover:text-edTexto'
              }`}
            >
              Todas
            </button>
            {pastas.map((p) => (
              <button
                key={p.id}
                onClick={() => setPasta(p.id)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  pasta === p.id
                    ? 'bg-rosa text-white'
                    : 'border border-edLinha text-edSuave hover:text-edTexto'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid max-h-[58vh] grid-cols-3 gap-2 overflow-y-auto md:grid-cols-6">
          {visiveis.map((f) => (
            <button
              key={f.id}
              onClick={() => f.url && aoEscolher({ id: f.id, url: f.url })}
              className="overflow-hidden rounded-xl border-2 border-transparent transition hover:border-rosa"
              title={f.prompt ?? ''}
            >
              {f.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt="" className="aspect-[3/4] w-full object-cover" />
              )}
            </button>
          ))}
        </div>

        {!aCarregar && visiveis.length === 0 && (
          <p className="py-6 text-center text-sm text-edSuave">
            {pasta ? 'Esta pasta está vazia.' : 'A biblioteca está vazia — carrega fotografias em Fotografias.'}
          </p>
        )}
      </div>
    </div>
  );
}
