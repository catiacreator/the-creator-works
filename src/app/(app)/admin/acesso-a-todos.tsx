'use client';

import { useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { comBase } from '@/lib/caminho';

/**
 * Dar acesso a toda a gente, de uma vez.
 *
 * Nasceu de um dia mau: a entrada pelo CarouselSnap ainda não abre e os
 * alunos estão à porta. O prazo de cada um edita-se na lista abaixo, um a
 * um — com trinta pessoas isso é meia hora de cliques, e meia hora é muito
 * tempo quando há gente a pagar e a bater à porta.
 *
 * Não mexe em papéis nem em contas suspensas. Só empurra o prazo de quem
 * está ativo.
 */
export function AcessoATodos({ aoMudar }: { aoMudar?: () => void }) {
  const [dias, setDias] = useState<string>('30');
  const [semPrazo, setSemPrazo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function dar() {
    const quantos = semPrazo ? null : Math.floor(Number(dias));
    const aviso = semPrazo
      ? 'Dar acesso sem prazo nenhum a toda a gente que está ativa?'
      : `Dar ${quantos} dias de acesso a toda a gente que está ativa?`;
    if (!window.confirm(aviso)) return;

    setOcupado(true);
    setErro(null);
    setRecado(null);

    const r = await fetch(comBase('/api/membros/todos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias: quantos }),
    });
    const d = await r.json();
    setOcupado(false);

    if (d.error) return setErro(d.error);

    setRecado(
      d.ate
        ? `${d.quantos} ${d.quantos === 1 ? 'pessoa ficou' : 'pessoas ficaram'} com acesso até ${new Date(
            d.ate,
          ).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}.`
        : `${d.quantos} ${d.quantos === 1 ? 'pessoa ficou' : 'pessoas ficaram'} com acesso sem prazo.`,
    );
    aoMudar?.();
  }

  return (
    <Card className="mb-4">
      <div className="mb-1 flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-muted" />
        <h2 className="font-medium">Dar acesso a toda a gente</h2>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-muted">
        Empurra o prazo de todas as pessoas que estão ativas, de uma vez. Não
        mexe em papéis nem ressuscita contas que suspendeste — só o prazo.
      </p>

      {erro && (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {erro}
        </p>
      )}
      {recado && (
        <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {recado}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!semPrazo && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="number"
              min={1}
              max={365}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              className="input w-24"
            />
            dias
          </label>
        )}

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={semPrazo}
            onChange={(e) => setSemPrazo(e.target.checked)}
          />
          sem prazo nenhum
        </label>

        <button
          onClick={dar}
          disabled={ocupado || (!semPrazo && !Number(dias))}
          className="btn-primario ml-auto"
        >
          {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
          Dar acesso
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Enquanto a entrada pelo CarouselSnap não estiver a funcionar, isto é o
        que mantém os teus alunos lá dentro. Quando ela abrir, cada entrada
        passa a empurrar o prazo sozinha e deixas de precisar disto.
      </p>
    </Card>
  );
}
