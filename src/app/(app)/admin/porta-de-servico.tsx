'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, DoorOpen, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { MINIMO_CHAVE_ADMIN } from '@/lib/limites';

interface Estado {
  tem: boolean;
  criada_em: string | null;
  ultimo_uso: string | null;
  erros_hoje: number;
}

const dia = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/**
 * A porta de serviço, no Admin.
 *
 * Desde que a entrada é pelo CarouselSnap, a Cátia entra como toda a gente:
 * salta de lá para cá. Esta é a alternativa para os dias em que isso não dá —
 * o CarouselSnap em baixo, um computador onde não tem a sessão dele, ou ela a
 * arranjar precisamente a ligação entre os dois.
 *
 * O cartão mostra sempre três coisas: se a porta existe, quando foi usada pela
 * última vez, e quantas tentativas erradas houve hoje. A terceira é a que
 * interessa mais — é o único sítio onde ela dá por alguém à procura.
 */
export function PortaDeServico() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [meu, setMeu] = useState('');
  const [aEscolher, setAEscolher] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch('/api/chave-admin')
      .then((r) => r.json())
      .then((d) => (d.error ? setErro(d.error) : setEstado(d)))
      .catch(() => setErro('Não deu para ver como está a porta.'));
  }, []);

  async function guardar(escolhido?: string) {
    setOcupado(true);
    setErro(null);
    const r = await fetch('/api/chave-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(escolhido ? { codigo: escolhido } : {}),
    });
    const d = await r.json();
    setOcupado(false);
    if (d.error) return setErro(d.error);

    setCodigo(d.codigo);
    setMeu('');
    setAEscolher(false);
    setEstado({ tem: true, criada_em: new Date().toISOString(), ultimo_uso: null, erros_hoje: 0 });
  }

  async function fechar() {
    if (!window.confirm('Fechar a porta? Ficas a entrar só pelo CarouselSnap.')) return;
    setOcupado(true);
    setErro(null);
    const r = await fetch('/api/chave-admin', { method: 'DELETE' });
    const d = await r.json();
    setOcupado(false);
    if (d.error) return setErro(d.error);
    setCodigo(null);
    setEstado({ tem: false, criada_em: null, ultimo_uso: null, erros_hoje: 0 });
  }

  return (
    <Card className="mb-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <DoorOpen className="h-4 w-4 text-muted" />
        <h2 className="font-medium">A tua entrada por fora</h2>
        {estado && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              estado.tem ? 'bg-rosa text-white' : 'bg-creme text-muted'
            }`}
          >
            {estado.tem ? 'aberta' : 'fechada'}
          </span>
        )}
      </div>

      <p className="mb-3 text-sm leading-relaxed text-muted">
        Um código só teu para entrares em{' '}
        <strong className="text-ink">thecreatorworks.com/admin-login</strong> sem passar pelo
        CarouselSnap — para os dias em que ele está em baixo, ou estás num computador onde não
        tens a sessão dele. Só funciona para ti, e só enquanto fores admin.
      </p>

      {erro && (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {erro}
        </p>
      )}

      {/* o código, a única vez que se vê */}
      {codigo && (
        <div className="mb-3 rounded-xl border border-sand bg-creme/70 px-4 py-3">
          <p className="mb-2 text-sm font-medium">
            Copia-o agora — não se volta a ver.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-superficie px-3 py-2 font-mono text-sm">
              {codigo}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codigo);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="btn-fantasma shrink-0"
              title="Copiar"
            >
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Guarda-o onde guardas as palavras-passe. Aqui fica só a conta do scrypt dele — se o
            perderes, o caminho é fazer outro, não há como o recuperar.
          </p>
        </div>
      )}

      {estado?.tem && !codigo && (
        <div className="mb-3 grid gap-2 rounded-xl bg-creme/70 px-4 py-3 text-sm sm:grid-cols-3">
          <span className="text-muted">
            Posta a <strong className="text-ink">{dia(estado.criada_em)}</strong>
          </span>
          <span className="text-muted">
            Usada <strong className="text-ink">{estado.ultimo_uso ? dia(estado.ultimo_uso) : 'nunca'}</strong>
          </span>
          <span className={estado.erros_hoje > 0 ? 'text-rose-700' : 'text-muted'}>
            {estado.erros_hoje > 0 && <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />}
            <strong>{estado.erros_hoje}</strong> erros hoje
          </span>
        </div>
      )}

      {estado?.erros_hoje ? (
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Cinco enganos seguidos do mesmo sítio fecham a porta por um quarto de hora. Se este
          número crescer sem seres tu, troca o código.
        </p>
      ) : null}

      {/* escolher um à mão, para quem prefere decorar */}
      {aEscolher && (
        <div className="mb-3">
          <input
            type="text"
            value={meu}
            onChange={(e) => setMeu(e.target.value)}
            placeholder={`Pelo menos ${MINIMO_CHAVE_ADMIN} caracteres, sem espaços`}
            className="input mb-2 w-full font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-relaxed text-muted">
            Um código inventado aqui é muito mais difícil de adivinhar do que um pensado de
            cabeça. Se escolheres um teu, que não seja parecido com nenhuma palavra-passe que já
            uses.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => (aEscolher ? guardar(meu) : guardar())}
          disabled={ocupado || (aEscolher && !meu.trim())}
          className="btn-primario"
        >
          {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
          {estado?.tem ? 'Trocar o código' : 'Criar o código'}
        </button>

        {!aEscolher && (
          <button onClick={() => setAEscolher(true)} disabled={ocupado} className="btn-fantasma">
            Quero escolher um
          </button>
        )}
        {aEscolher && (
          <button
            onClick={() => {
              setAEscolher(false);
              setMeu('');
            }}
            className="btn-fantasma"
          >
            Deixa a app inventar
          </button>
        )}

        {estado?.tem && (
          <button onClick={fechar} disabled={ocupado} className="btn-fantasma text-rosa">
            <Trash2 className="h-4 w-4" />
            Fechar a porta
          </button>
        )}
      </div>
    </Card>
  );
}
