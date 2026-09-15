'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Loader2, Search, Sparkles } from 'lucide-react';
import { Card, Empty, PageHeader } from '@/components/ui';
import {
  BIBLIOTECA_DE_GANCHOS,
  CATEGORIAS_DE_GANCHOS,
  type GanchoDaBiblioteca,
} from '@/lib/biblioteca-ganchos';

/**
 * A biblioteca de ganchos, finalmente à vista.
 *
 * Os cem ganchos estavam escritos há muito tempo, num ficheiro que nenhuma
 * página importava. Cem aberturas prontas, arrumadas por sentimento, a não
 * servir ninguém — o código existia e o caminho até ele não.
 *
 * E há um segundo passo que muda tudo. Cada molde tem buracos:
 *
 *     «Não sei quem precisa de ouvir isto mas: [verdade do teu nicho]»
 *
 * O molde dá a forma. A substância é de quem escreve — e é aí que a maior
 * parte das pessoas pára: olha para o colchete, não sabe o que lá pôr, e
 * fecha a página. Por isso cada gancho tem o botão que o veste com o nicho
 * dela, a partir do briefing que já respondeu.
 *
 * Dez de cada vez, e não um: a primeira frase que sai é quase sempre a mais
 * óbvia, e ninguém sabe se gosta dela sem ter ao lado as que não escolheu.
 */
export default function GanchosPage() {
  const [categoria, setCategoria] = useState('Todos');
  const [procura, setProcura] = useState('');

  /** o molde que está a ser vestido, e o que saiu */
  const [aberto, setAberto] = useState<string | null>(null);
  const [aAdaptar, setAAdaptar] = useState<string | null>(null);
  const [frases, setFrases] = useState<Record<string, string[]>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const lista = useMemo(() => {
    const q = procura.trim().toLowerCase();
    return BIBLIOTECA_DE_GANCHOS.filter(
      (g: GanchoDaBiblioteca) =>
        (categoria === 'Todos' || g.categoria === categoria) &&
        (!q || g.texto.toLowerCase().includes(q)),
    );
  }, [categoria, procura]);

  async function adaptar(molde: string) {
    setAAdaptar(molde);
    setAberto(molde);
    setErro(null);
    const r = await fetch('/api/ganchos/adaptar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ molde }),
    })
      .then((x) => x.json())
      .catch(() => ({ error: 'Não consegui falar com a Cát.IA.' }));
    setAAdaptar(null);
    if (r.error) return setErro(r.error);
    setFrases((f) => ({ ...f, [molde]: r.frases as string[] }));
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(texto);
      window.setTimeout(() => setCopiado((c) => (c === texto ? null : c)), 1600);
    } catch {
      setErro('O browser não deixou copiar. Selecciona e copia à mão.');
    }
  }

  return (
    <>
      <PageHeader
        title="Ganchos"
        subtitle="Cem aberturas prontas, arrumadas por sentimento. O molde dá a forma; carrega em «Adaptar» e a Cát.IA veste-o com o teu nicho."
        action={<span className="text-xs text-muted">{lista.length} de {BIBLIOTECA_DE_GANCHOS.length}</span>}
      />

      {erro && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {erro}
        </p>
      )}

      {/* ── procurar e filtrar ─────────────────────────── */}
      <Card className="mb-4">
        <label className="mb-3 flex items-center gap-2 rounded-xl border border-sand px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Procurar um gancho…"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_DE_GANCHOS.map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                c === categoria
                  ? 'bg-ink text-paper'
                  : 'border border-sand text-muted hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      {/* ── os ganchos ─────────────────────────────────── */}
      {lista.length === 0 ? (
        <Empty>Nenhum gancho com essas palavras. Tenta outras, ou tira o filtro.</Empty>
      ) : (
        <div className="space-y-3">
          {lista.map((g) => {
            const saiu = frases[g.texto];
            const aTrabalhar = aAdaptar === g.texto;

            return (
              <Card key={g.texto}>
                <p className="mb-1 text-xs text-muted">{g.categoria}</p>
                <p className="leading-relaxed">{g.texto}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="btn-fantasma px-3 py-1.5 text-xs"
                    onClick={() => adaptar(g.texto)}
                    disabled={Boolean(aAdaptar)}
                  >
                    {aTrabalhar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {saiu ? 'Adaptar outra vez' : 'Adaptar ao meu nicho'}
                  </button>

                  <button
                    className="px-3 py-1.5 text-xs text-muted hover:text-ink"
                    onClick={() => copiar(g.texto)}
                  >
                    {copiado === g.texto ? (
                      <Check className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="mr-1 inline h-3.5 w-3.5" />
                    )}
                    Copiar o molde
                  </button>
                </div>

                {saiu && aberto === g.texto && (
                  <ul className="mt-4 space-y-2 border-t border-sand pt-4">
                    {saiu.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <button
                          className="mt-0.5 shrink-0 text-muted hover:text-ink"
                          onClick={() => copiar(f)}
                          title="Copiar"
                        >
                          {copiado === f ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <span className="text-sm leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
