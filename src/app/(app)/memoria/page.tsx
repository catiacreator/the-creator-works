'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  Brain,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Card, Dialogo, Empty, PageHeader, Separador, Spinner } from '@/components/ui';
import {
  TIPOS,
  estadoDaCampanha,
  estrelas,
  type Campanha,
  type Historia,
  type Memoria,
  type TipoDeMemoria,
} from '@/lib/memoria';

type Aba = 'memorias' | 'campanhas' | 'historias';

const hoje = () => new Date().toISOString().slice(0, 10);

const data = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Memória da Cát.IA.
 *
 * O briefing diz quem ela é; isto diz o que a Cát.IA já aprendeu a fazer com
 * ela. Três separadores: o que sabe, o que ela anda a vender, e as histórias
 * reais que pode contar em vez de inventar.
 */
export default function MemoriaPage() {
  const [aba, setAba] = useState<Aba>('memorias');

  const [memorias, setMemorias] = useState<Memoria[] | null>(null);
  const [campanhas, setCampanhas] = useState<Campanha[] | null>(null);
  const [historias, setHistorias] = useState<Historia[] | null>(null);

  const [aAtualizar, setAAtualizar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [novaRegra, setNovaRegra] = useState<string | null>(null);
  const [aLimparTudo, setALimparTudo] = useState(false);
  const [campanha, setCampanha] = useState<Partial<Campanha> | null>(null);
  const [historia, setHistoria] = useState<Partial<Historia> | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    setAAtualizar(true);
    const [m, c, h] = await Promise.all([
      fetch('/api/memorias').then((r) => r.json()),
      fetch('/api/campanhas').then((r) => r.json()),
      fetch('/api/historias').then((r) => r.json()),
    ]);
    setMemorias(m.memorias ?? []);
    setCampanhas(c.campanhas ?? []);
    setHistorias(h.historias ?? []);
    setAAtualizar(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  /** Uma volta ao servidor com o erro tratado num sítio só. */
  async function pedir(url: string, init: RequestInit) {
    setOcupado(true);
    setErro(null);
    try {
      const res = await fetch(url, init);
      const dados = await res.json();
      if (dados.error) throw new Error(dados.error);
      await carregar();
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu.');
      return false;
    } finally {
      setOcupado(false);
    }
  }

  const json = (corpo: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });

  return (
    <>
      <PageHeader
        title="Memória da Cát.IA"
        subtitle="O que ela já sabe de ti, e passa a respeitar em tudo o que escreve."
      />

      <Separador<Aba>
        valor={aba}
        set={setAba}
        opcoes={[
          { id: 'memorias', label: 'Memórias', icone: Brain },
          { id: 'campanhas', label: 'Campanhas', icone: Megaphone },
          { id: 'historias', label: 'Histórias', icone: BookOpen },
        ]}
      />

      {erro && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {erro}
        </div>
      )}

      {/* ── memórias ─────────────────────────────── */}
      {aba === 'memorias' && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button className="btn-primary" onClick={() => setNovaRegra('')}>
              <Plus className="h-4 w-4" />
              Nova regra
            </button>
            <button className="btn-ghost" onClick={carregar} disabled={aAtualizar}>
              <RefreshCw className={`h-4 w-4 ${aAtualizar ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            {!!memorias?.length && (
              <button
                className="btn-ghost ml-auto text-muted hover:text-rosa"
                onClick={() => setALimparTudo(true)}
              >
                <Trash2 className="h-4 w-4" />
                Esquecer tudo
              </button>
            )}
          </div>

          {!memorias ? (
            <Spinner label="A ler o que ela sabe…" />
          ) : !memorias.length ? (
            <Empty>
              Ainda não há memória nenhuma. Escreve a primeira regra — por exemplo, uma palavra que
              não queres ver escrita — ou deixa que ela aprenda contigo à medida que trabalham.
            </Empty>
          ) : (
            <div className="space-y-4">
              {TIPOS.map((t) => {
                const doTipo = memorias.filter((m) => m.tipo === t.id);
                if (!doTipo.length) return null;
                return (
                  <Card key={t.id}>
                    <div className={`-m-5 mb-4 rounded-t-[1.25rem] border-b px-5 py-4 ${t.fundo}`}>
                      <div className="flex items-center gap-2">
                        <h2 className={`font-semibold ${t.cor}`}>{t.nome}</h2>
                        <span className="rounded-full bg-superficie px-2 py-0.5 text-xs text-muted">
                          {doTipo.length}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted">{t.descricao}</p>
                    </div>

                    <ul className="divide-y divide-sand">
                      {doTipo.map((m) => (
                        <li key={m.id} className="group flex items-start gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] leading-relaxed">{m.conteudo}</p>
                            <p className="mt-1 text-xs text-muted">
                              <span
                                className="text-[#D9A404]"
                                title={`Importância: ${m.importancia}/5`}
                              >
                                {estrelas(m.importancia)}
                              </span>
                              <span className="mx-2">·</span>
                              {data(m.created_at)}
                              {m.origem && m.origem !== 'manual' && (
                                <>
                                  <span className="mx-2">·</span>
                                  {m.origem}
                                </>
                              )}
                            </p>
                          </div>
                          <button
                            className="rounded-lg p-2 text-muted opacity-0 transition hover:text-rosa group-hover:opacity-100"
                            title="Esquecer esta"
                            onClick={() => pedir(`/api/memorias?id=${m.id}`, { method: 'DELETE' })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="mt-6">
            <h2 className="mb-1 font-medium">Como funciona</h2>
            <p className="text-sm leading-relaxed text-muted">
              As <strong>regras</strong> são ordens tuas: passam à frente do método e do formato, e
              entram sempre com peso máximo. O resto é contexto — vai crescendo com o que fores
              corrigindo. Tudo o que está aqui viaja com cada pedido à Cát.IA, no chat e na escrita
              dos carrosséis.
            </p>
          </Card>
        </>
      )}

      {/* ── campanhas ────────────────────────────── */}
      {aba === 'campanhas' && (
        <>
          <div className="mb-5 flex items-center gap-2">
            <button
              className="btn-primary"
              onClick={() => setCampanha({ inicio: hoje(), fim: hoje(), ativa: true })}
            >
              <Plus className="h-4 w-4" />
              Nova campanha
            </button>
          </div>

          {!campanhas ? (
            <Spinner />
          ) : !campanhas.length ? (
            <Empty>
              Sem campanhas. Quando tiveres algo a vender — um lançamento, uma mentoria aberta —
              escreve-o aqui e a Cát.IA passa a apontar o conteúdo para lá.
            </Empty>
          ) : (
            <div className="space-y-3">
              {campanhas.map((c) => {
                const estado = estadoDaCampanha(c);
                return (
                  <Card key={c.id}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{c.nome}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              estado === 'ativa'
                                ? 'bg-rosa text-white'
                                : estado === 'agendada'
                                  ? 'bg-manteiga text-ink'
                                  : 'bg-creme text-muted'
                            }`}
                          >
                            {estado === 'ativa'
                              ? 'a decorrer'
                              : estado === 'agendada'
                                ? 'agendada'
                                : estado === 'terminada'
                                  ? 'terminada'
                                  : 'em pausa'}
                          </span>
                        </div>
                        {c.descricao && (
                          <p className="mt-1 text-sm leading-relaxed text-muted">{c.descricao}</p>
                        )}
                        <p className="mt-1 text-xs text-muted">
                          {c.produto && (
                            <>
                              {c.produto}
                              <span className="mx-2">·</span>
                            </>
                          )}
                          {c.inicio} a {c.fim}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          className="rounded-lg p-2 text-muted transition hover:text-ink"
                          title={c.ativa ? 'Pôr em pausa' : 'Retomar'}
                          onClick={() =>
                            pedir('/api/campanhas', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: c.id, ativa: !c.ativa }),
                            })
                          }
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-muted transition hover:text-ink"
                          title="Editar"
                          onClick={() => setCampanha(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-muted transition hover:text-rosa"
                          title="Apagar"
                          onClick={() => pedir(`/api/campanhas?id=${c.id}`, { method: 'DELETE' })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── histórias ────────────────────────────── */}
      {aba === 'historias' && (
        <>
          <div className="mb-5 flex items-center gap-2">
            <button className="btn-primary" onClick={() => setHistoria({})}>
              <Plus className="h-4 w-4" />
              Nova história
            </button>
          </div>

          {!historias ? (
            <Spinner />
          ) : !historias.length ? (
            <Empty>
              Ainda não há histórias. Conta uma coisa que te aconteceu mesmo — o contexto, o que
              sentiste, o que mudou. É daqui que sai o storytelling que ninguém consegue copiar.
            </Empty>
          ) : (
            <div className="space-y-3">
              {historias.map((h) => (
                <Card key={h.id}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{h.titulo}</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                        {h.historia.length > 320 ? `${h.historia.slice(0, 320)}…` : h.historia}
                      </p>
                      <p className="mt-2 text-xs text-muted">{data(h.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        className="rounded-lg p-2 text-muted transition hover:text-ink"
                        title="Editar"
                        onClick={() => setHistoria(h)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-2 text-muted transition hover:text-rosa"
                        title="Apagar"
                        onClick={() => pedir(`/api/historias?id=${h.id}`, { method: 'DELETE' })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── diálogos ─────────────────────────────── */}
      {novaRegra !== null && (
        <Dialogo
          titulo="Nova regra"
          texto="As regras passam à frente de tudo o resto. Servem para proibir uma palavra, exigir um formato, travar um hábito."
          confirmar="Guardar regra"
          ocupado={ocupado}
          aoFechar={() => setNovaRegra(null)}
          aoConfirmar={async () => {
            const feito = await pedir(
              '/api/memorias',
              json({ tipo: 'regra' as TipoDeMemoria, conteudo: novaRegra }),
            );
            if (feito) setNovaRegra(null);
          }}
        >
          <textarea
            className="input mb-2 min-h-[110px]"
            autoFocus
            value={novaRegra}
            onChange={(e) => setNovaRegra(e.target.value)}
            placeholder={'Ex.: Nunca usar a palavra "jornada". Trocar por "caminho" ou "processo".'}
          />
          <p className="mb-4 text-xs text-muted">
            Sê específica: <em>&ldquo;não usar o termo X&rdquo;</em> resulta melhor do que{' '}
            <em>&ldquo;fala de forma mais natural&rdquo;</em>.
          </p>
        </Dialogo>
      )}

      {aLimparTudo && (
        <Dialogo
          titulo="Esquecer tudo?"
          texto="A Cát.IA perde todo o contexto que juntou sobre ti e começa do zero na próxima conversa. As regras vão com o resto. Isto não se desfaz."
          confirmar="Sim, esquecer tudo"
          perigo
          ocupado={ocupado}
          aoFechar={() => setALimparTudo(false)}
          aoConfirmar={async () => {
            const feito = await pedir('/api/memorias?tudo=1', { method: 'DELETE' });
            if (feito) setALimparTudo(false);
          }}
        />
      )}

      {campanha && (
        <Dialogo
          titulo={campanha.id ? 'Editar campanha' : 'Nova campanha'}
          confirmar={campanha.id ? 'Guardar alterações' : 'Criar campanha'}
          ocupado={ocupado}
          aoFechar={() => setCampanha(null)}
          aoConfirmar={async () => {
            const feito = await pedir('/api/campanhas', json(campanha));
            if (feito) setCampanha(null);
          }}
        >
          <div className="mb-4 space-y-3">
            <div>
              <label className="label">Nome da campanha</label>
              <input
                className="input"
                autoFocus
                value={campanha.nome ?? ''}
                onChange={(e) => setCampanha({ ...campanha, nome: e.target.value })}
                placeholder="Ex.: Lançamento do Método X"
              />
            </div>
            <div>
              <label className="label">A promessa, numa linha</label>
              <input
                className="input"
                value={campanha.descricao ?? ''}
                onChange={(e) => setCampanha({ ...campanha, descricao: e.target.value })}
                placeholder="Ex.: Sair do zero a publicar todos os dias em 30 dias"
              />
            </div>
            <div>
              <label className="label">Produto</label>
              <input
                className="input"
                value={campanha.produto ?? ''}
                onChange={(e) => setCampanha({ ...campanha, produto: e.target.value })}
                placeholder="Ex.: Mentoria 1:1"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Começa</label>
                <input
                  type="date"
                  className="input"
                  value={campanha.inicio ?? hoje()}
                  onChange={(e) => setCampanha({ ...campanha, inicio: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="label">Acaba</label>
                <input
                  type="date"
                  className="input"
                  value={campanha.fim ?? hoje()}
                  onChange={(e) => setCampanha({ ...campanha, fim: e.target.value })}
                />
              </div>
            </div>
          </div>
        </Dialogo>
      )}

      {historia && (
        <Dialogo
          titulo={historia.id ? 'Editar história' : 'Nova história'}
          texto="Conta uma coisa que te aconteceu mesmo, com os pormenores que importam: o contexto, o que sentiste, o que mudou."
          confirmar={historia.id ? 'Guardar alterações' : 'Guardar história'}
          ocupado={ocupado}
          aoFechar={() => setHistoria(null)}
          aoConfirmar={async () => {
            const feito = await pedir('/api/historias', json(historia));
            if (feito) setHistoria(null);
          }}
        >
          <div className="mb-4 space-y-3">
            <div>
              <label className="label">Título</label>
              <input
                className="input"
                autoFocus
                value={historia.titulo ?? ''}
                onChange={(e) => setHistoria({ ...historia, titulo: e.target.value })}
                placeholder="Ex.: O cliente que desapareceu depois do orçamento"
              />
            </div>
            <div>
              <label className="label">A história</label>
              <textarea
                className="input min-h-[180px]"
                value={historia.historia ?? ''}
                onChange={(e) => setHistoria({ ...historia, historia: e.target.value })}
                placeholder="Era uma sexta-feira e…"
              />
            </div>
          </div>
        </Dialogo>
      )}
    </>
  );
}
