'use client';

import { useEffect, useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';

interface Versao {
  id: string;
  title: string | null;
  motivo: string;
  created_at: string;
}

const MOTIVOS: Record<string, string> = {
  guardado: 'Antes de guardares',
  'antes de repor': 'Antes de repores outra',
};

/** “ontem às 14:32”, que é como se fala, e não uma data ISO. */
function quando(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const dia = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' });
  const hora = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  const mesmoDia = d.toDateString() === hoje.toDateString();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  if (mesmoDia) return `hoje às ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `ontem às ${hora}`;
  return `${dia} às ${hora}`;
}

/**
 * O histórico de um carrossel.
 *
 * Cada vez que se guarda, a versão anterior fica arrumada. Aqui escolhe-se
 * uma e põe-se de volta — e a que estava agora também fica guardada, para
 * enganares-te a voltar atrás ter volta.
 */
export function Historico({
  carrosselId,
  aberto,
  fechar,
  aoRepor,
}: {
  carrosselId: string;
  aberto: boolean;
  fechar: () => void;
  aoRepor: () => void;
}) {
  const [versoes, setVersoes] = useState<Versao[] | null>(null);
  const [aRepor, setARepor] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setVersoes(null);
    setErro(null);
    fetch(`/api/carousels/${carrosselId}/versoes`)
      .then((r) => r.json())
      .then((d) => (d.error ? setErro(d.error) : setVersoes(d.versoes ?? [])))
      .catch(() => setErro('Não consegui ler o histórico.'));
  }, [aberto, carrosselId]);

  if (!aberto) return null;

  async function repor(id: string) {
    setARepor(id);
    setErro(null);
    try {
      const r = await fetch(`/api/carousels/${carrosselId}/versoes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ versaoId: id }),
      });
      const d = await r.json();
      if (d.error) {
        setErro(d.error);
        return;
      }
      aoRepor();
    } finally {
      setARepor(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="cartao flex max-h-[80vh] w-full max-w-md flex-col p-6">
        <div className="mb-1 flex items-center gap-2">
          <History className="h-4 w-4 text-edSuave" />
          <h2 className="text-base font-semibold">Histórico de versões</h2>
          <button onClick={fechar} className="ml-auto rounded-full p-1 text-edSuave hover:text-edTexto">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-edSuave">
          Cada vez que guardaste, a versão anterior ficou aqui. Repor não apaga o
          que está agora — isso também fica guardado.
        </p>

        {erro && (
          <p className="mb-3 rounded-xl bg-rosa/15 px-3 py-2 text-xs text-brand-soft">{erro}</p>
        )}

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {versoes === null && !erro && (
            <p className="py-6 text-center text-xs text-edSuave">A ler o histórico…</p>
          )}

          {versoes?.length === 0 && (
            <p className="py-6 text-center text-xs leading-relaxed text-edSuave">
              Ainda não há versões anteriores. A primeira aparece aqui assim que
              guardares este carrossel outra vez.
            </p>
          )}

          {versoes?.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-xl border border-edLinha px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-edTexto">{v.title || 'Sem título'}</p>
                <p className="text-[11px] text-edSuave">
                  {quando(v.created_at)} · {MOTIVOS[v.motivo] ?? v.motivo}
                </p>
              </div>
              <button
                onClick={() => repor(v.id)}
                disabled={aRepor !== null}
                className="btn-secundario shrink-0 text-[11px]"
              >
                <RotateCcw className="h-3 w-3" />
                {aRepor === v.id ? 'A repor…' : 'Repor'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
