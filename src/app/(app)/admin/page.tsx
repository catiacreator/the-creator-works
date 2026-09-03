'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Eye,
  EyeOff,
  LayoutList,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { Card, Dialogo, Empty, PageHeader, Separador, Spinner } from '@/components/ui';
import { PAGINAS, type EstadoDasPaginas } from '@/lib/paginas';
import {
  INTOCAVEIS,
  MATRIZ_PADRAO,
  NOMES_DAS_PERMISSOES,
  PAPEIS,
  TODAS_AS_PERMISSOES,
  type Matriz,
  type Membro,
  type Papel,
  type Permissao,
} from '@/lib/papeis';

type Aba = 'pessoas' | 'papeis' | 'paginas';

const data = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

/**
 * Admin — quem entra na app e o que cada um pode fazer.
 *
 * Convida-se pelo email, mesmo antes de a pessoa existir: quando ela entrar
 * pela primeira vez já cá encontra o lugar. Quem manda é o papel, e a tabela
 * dos papéis está à vista no fundo da página para não haver dúvidas.
 */
export default function AdminPage() {
  const router = useRouter();
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const [eu, setEu] = useState<string | null>(null);
  const [podeGerir, setPodeGerir] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [convite, setConvite] = useState<{ email: string; nome: string; papel: Papel } | null>(
    null,
  );
  const [aRemover, setARemover] = useState<Membro | null>(null);
  const [matriz, setMatriz] = useState<Matriz>(MATRIZ_PADRAO);
  const [paginas, setPaginas] = useState<EstadoDasPaginas>({});
  const [aba, setAba] = useState<Aba>('pessoas');

  async function carregar() {
    const d = await fetch('/api/membros').then((r) => r.json());
    if (d.error) return setErro(d.error);
    setMembros(d.membros ?? []);
    setEu(d.eu?.email ?? null);
    setMatriz((d.matriz as Matriz) ?? MATRIZ_PADRAO);
    setPodeGerir((d.eu?.permissoes ?? []).includes('gerir-pessoas'));

    const p = await fetch('/api/paginas')
      .then((r) => r.json())
      .then((x) => (x.paginas as EstadoDasPaginas) ?? {})
      .catch(() => ({}) as EstadoDasPaginas);
    setPaginas(p);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function pedir(url: string, init: RequestInit) {
    setOcupado(true);
    setErro(null);
    try {
      const d = await fetch(url, init).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      await carregar();
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu.');
      return false;
    } finally {
      setOcupado(false);
    }
  }

  /** Esconder uma página, pô-la em obras, ou reabri-la. */
  async function mudarPagina(caminho: string, campos: { escondida?: boolean; manutencao?: boolean }) {
    const antes = paginas[caminho] ?? { caminho, escondida: false, manutencao: false };
    const depois = { ...antes, ...campos };
    setPaginas({ ...paginas, [caminho]: depois });

    setOcupado(true);
    setErro(null);
    try {
      const d = await fetch('/api/paginas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depois),
      }).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      router.refresh(); // o menu é desenhado no servidor
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu.');
      setPaginas((x) => ({ ...x, [caminho]: antes }));
    } finally {
      setOcupado(false);
    }
  }

  /** Ver o que encontra quem acabou de se registar. */
  async function verPrimeiroDia() {
    setOcupado(true);
    const d = await fetch('/api/ver-como', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primeiroDia: true }),
    }).then((r) => r.json());
    setOcupado(false);
    if (d.error) return setErro(d.error);
    router.push('/perfil');
    router.refresh();
  }

  /** Espreitar a app pelos olhos de outro papel. */
  async function verComo(papel: Papel) {
    setOcupado(true);
    const d = await fetch('/api/ver-como', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ papel }),
    }).then((r) => r.json());
    setOcupado(false);
    if (d.error) return setErro(d.error);
    router.push('/criar');
    router.refresh();
  }

  /** Dar ou tirar uma permissão a um papel. Guarda-se logo. */
  async function trocarPermissao(papel: Papel, permissao: Permissao, dar: boolean) {
    const atuais = matriz[papel] ?? [];
    const novas = dar ? [...atuais, permissao] : atuais.filter((x) => x !== permissao);
    setMatriz({ ...matriz, [papel]: novas }); // mostra já, corrige-se se falhar

    setOcupado(true);
    setErro(null);
    try {
      const d = await fetch('/api/papeis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papel, permissoes: novas }),
      }).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      setMatriz((m) => ({ ...m, [papel]: d.permissoes }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu.');
      setMatriz((m) => ({ ...m, [papel]: atuais }));
    } finally {
      setOcupado(false);
    }
  }

  const souEu = (m: Membro) => m.email.toLowerCase() === (eu ?? '').toLowerCase();
  /** a conta dona da app não se muda a partir daqui, nem por outro admin */
  const eADona = (m: Membro) =>
    m.email.toLowerCase() === (process.env.NEXT_PUBLIC_EMAIL_DA_DONA ?? 'catiacreator@gmail.com');
  const travadoPara = (m: Membro) => !podeGerir || souEu(m) || eADona(m) || ocupado;

  return (
    <>
      <PageHeader
        title="Admin"
        subtitle="Quem entra nesta app, e o que cada pessoa pode fazer lá dentro."
        action={
          podeGerir && aba === 'pessoas' ? (
            <button
              className="btn-primary"
              onClick={() => setConvite({ email: '', nome: '', papel: 'aluno' })}
            >
              <UserPlus className="h-4 w-4" />
              Convidar
            </button>
          ) : undefined
        }
      />

      <Separador<Aba>
        valor={aba}
        set={setAba}
        opcoes={[
          { id: 'pessoas', label: 'Pessoas', icone: Users },
          { id: 'papeis', label: 'Papéis e permissões', icone: ShieldCheck },
          { id: 'paginas', label: 'Páginas', icone: LayoutList },
        ]}
      />

      {erro && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {erro}
        </div>
      )}

      {aba === 'pessoas' && (!membros ? (
        <Spinner label="A ver quem cá anda…" />
      ) : !membros.length ? (
        <Empty>
          <p className="mb-4">Ainda não há ninguém aqui além de ti.</p>
          {podeGerir && (
            <button
              className="btn-primary"
              onClick={() => setConvite({ email: '', nome: '', papel: 'aluno' })}
            >
              <UserPlus className="h-4 w-4" />
              Convidar a primeira pessoa
            </button>
          )}
        </Empty>
      ) : (
        <div className="space-y-3">
          {membros.map((m) => (
            <Card key={m.id}>
              <div className="flex flex-wrap items-start gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                    m.ativo ? 'bg-creme text-ink' : 'bg-creme text-muted/60'
                  }`}
                >
                  {(m.nome ?? m.email).slice(0, 1).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{m.nome ?? m.email}</span>
                    {souEu(m) && (
                      <span className="rounded-full bg-creme px-2 py-0.5 text-[11px] text-muted">
                        tu
                      </span>
                    )}
                    {eADona(m) && (
                      <span className="rounded-full bg-rosaSuave px-2 py-0.5 text-[11px] text-ink">
                        dona da app
                      </span>
                    )}
                    {!m.ativo && (
                      <span className="rounded-full bg-creme px-2 py-0.5 text-[11px] text-muted">
                        suspenso
                      </span>
                    )}
                  </div>
                  {m.nome && <p className="break-all text-sm text-muted">{m.email}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {m.ultimo_acesso ? `entrou a última vez em ${data(m.ultimo_acesso)}` : 'ainda não entrou'}
                    <span className="mx-2">·</span>
                    convidado em {data(m.created_at)}
                    {m.convidado_por && ` por ${m.convidado_por}`}
                  </p>
                </div>

                {/* o papel */}
                <div className="flex w-full items-center gap-1 rounded-2xl border border-sand bg-creme/60 p-1 sm:ml-auto sm:w-auto">
                  {PAPEIS.map((p) => {
                    const escolhido = m.papel === p.id;
                    const travado = travadoPara(m);
                    return (
                      <button
                        key={p.id}
                        title={
                          souEu(m)
                            ? 'Não podes mudar o teu próprio papel'
                            : eADona(m)
                              ? 'A conta dona da app é sempre admin'
                              : podeGerir
                                ? p.descricao
                                : 'Só a admin muda papéis'
                        }
                        disabled={travado}
                        onClick={() =>
                          pedir('/api/membros', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: m.id, papel: p.id }),
                          })
                        }
                        className={`flex-1 rounded-xl px-3 py-1.5 text-xs transition sm:flex-none ${
                          escolhido
                            ? 'bg-superficie font-semibold text-ink shadow-soft'
                            : travado
                              ? 'text-muted/50'
                              : 'text-muted hover:text-ink'
                        }`}
                      >
                        {p.nome}
                      </button>
                    );
                  })}
                </div>

                {podeGerir && !souEu(m) && !eADona(m) && (
                  <div className="flex shrink-0 items-center gap-1 sm:ml-0">
                    <button
                      title={m.ativo ? 'Suspender o acesso' : 'Devolver o acesso'}
                      className="rounded-lg p-2 text-muted transition hover:text-ink"
                      onClick={() =>
                        pedir('/api/membros', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: m.id, ativo: !m.ativo }),
                        })
                      }
                    >
                      {m.ativo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      title="Tirar o acesso de vez"
                      className="rounded-lg p-2 text-muted transition hover:text-rosa"
                      onClick={() => setARemover(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ))}

      {/* ── o que cada papel pode ──────────────────── */}
      {aba === 'papeis' && (
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-rosa" />
          <h2 className="font-medium">O que cada papel pode fazer</h2>
        </div>

        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-sand text-left">
                <th className="px-1 pb-2 font-medium text-muted">Pode</th>
                {PAPEIS.map((p) => (
                  <th key={p.id} className="px-1 pb-2 text-center font-medium">
                    {p.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TODAS_AS_PERMISSOES.map((perm) => (
                <tr key={perm} className="border-b border-sand/60 last:border-0">
                  <td className="px-1 py-2">{NOMES_DAS_PERMISSOES[perm]}</td>
                  {PAPEIS.map((p) => {
                    const tem = (matriz[p.id] ?? []).includes(perm);
                    const fixa = INTOCAVEIS[p.id].includes(perm);
                    return (
                      <td key={p.id} className="px-1 py-1 text-center">
                        <button
                          disabled={!podeGerir || fixa || ocupado}
                          title={
                            fixa
                              ? 'A admin não pode perder isto — ficaria sem forma de o devolver'
                              : podeGerir
                                ? tem
                                  ? 'Tirar'
                                  : 'Dar'
                                : 'Só a admin muda isto'
                          }
                          onClick={() => trocarPermissao(p.id, perm, !tem)}
                          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl transition ${
                            fixa
                              ? 'text-rosa/60'
                              : !podeGerir
                                ? tem
                                  ? 'text-rosa'
                                  : 'text-muted/40'
                                : tem
                                  ? 'text-rosa hover:bg-rosaSuave/60'
                                  : 'text-muted/40 hover:bg-creme hover:text-muted'
                          }`}
                        >
                          {tem ? <Check className="h-4 w-4" /> : <span>—</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-muted">
          {podeGerir
            ? 'Carrega em qualquer quadrado para dar ou tirar. Guarda-se sozinho, e vale para toda a gente com esse papel a partir do próximo clique que ela der na app.'
            : 'Só a admin muda esta tabela.'}
        </p>

        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          {PAPEIS.map((p) => (
            <li key={p.id}>
              <strong className="text-ink">{p.nome}</strong> —{' '}
              {(matriz[p.id] ?? []).length
                ? (matriz[p.id] ?? []).map((x) => NOMES_DAS_PERMISSOES[x].toLowerCase()).join(' · ')
                : 'não pode nada — entra e vê o Sobre mim'}
            </li>
          ))}
        </ul>
      </Card>

      )}

      {aba === 'papeis' && podeGerir && (
        <Card className="mt-4">
          <div className="mb-1 flex items-center gap-2">
            <Eye className="h-4 w-4 text-rosa" />
            <h2 className="font-medium">Ver a app como…</h2>
          </div>
          <p className="mb-4 text-sm text-muted">
            Entra na app pelos olhos de outro papel, para veres exatamente o que essa pessoa
            encontra — o menu que lhe aparece e as páginas a que chega. O{' '}
            <strong className="text-ink">primeiro dia</strong> mostra-te o que aparece a quem
            acabou de se registar: o Sobre mim à frente de tudo, com o menu fechado. Não muda nada
            na tua conta, e sais quando quiseres.
          </p>
          <div className="flex flex-wrap gap-2">
            {PAPEIS.filter((p) => p.id !== 'admin').map((p) => (
              <button
                key={p.id}
                className="btn-ghost"
                disabled={ocupado}
                onClick={() => verComo(p.id)}
              >
                <Eye className="h-4 w-4" />
                Ver como {p.nome}
              </button>
            ))}
            <button className="btn-ghost" disabled={ocupado} onClick={verPrimeiroDia}>
              <Eye className="h-4 w-4" />
              Ver o primeiro dia
            </button>
          </div>
        </Card>
      )}

      {aba === 'paginas' && (
        <>
          <Card className="mb-4">
            <h2 className="mb-1 font-medium">O que isto faz</h2>
            <p className="text-sm leading-relaxed text-muted">
              <strong className="text-ink">Esconder</strong> tira a página do menu e fecha a porta a
              quem lá tentar chegar pelo endereço.{' '}
              <strong className="text-ink">Em obras</strong> deixa-a no menu com a etiqueta, mas
              quem entra encontra um aviso em vez do conteúdo. Nos dois casos,{' '}
              <strong className="text-ink">tu continuas a entrar</strong> — és quem está a mexer lá
              dentro.
            </p>
          </Card>

          <div className="space-y-3">
            {PAGINAS.map((pag) => {
              const estado = paginas[pag.caminho];
              const escondida = Boolean(estado?.escondida);
              const obras = Boolean(estado?.manutencao);
              return (
                <Card key={pag.caminho}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{pag.nome}</span>
                        {escondida && (
                          <span className="rounded-full bg-creme px-2 py-0.5 text-[11px] text-muted">
                            escondida
                          </span>
                        )}
                        {obras && (
                          <span className="rounded-full bg-manteiga px-2 py-0.5 text-[11px] text-ink">
                            em obras
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        {pag.grupo} · {pag.caminho}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        disabled={!podeGerir || ocupado}
                        onClick={() => mudarPagina(pag.caminho, { escondida: !escondida })}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
                          escondida
                            ? 'border-ink bg-superficie font-medium text-ink'
                            : 'border-sand text-muted hover:border-ink/30 hover:text-ink'
                        }`}
                      >
                        {escondida ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {escondida ? 'Escondida' : 'Esconder'}
                      </button>

                      <button
                        disabled={!podeGerir || ocupado}
                        onClick={() => mudarPagina(pag.caminho, { manutencao: !obras })}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
                          obras
                            ? 'border-ink bg-superficie font-medium text-ink'
                            : 'border-sand text-muted hover:border-ink/30 hover:text-ink'
                        }`}
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        {obras ? 'Em obras' : 'Pôr em obras'}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── convidar ───────────────────────────────── */}
      {convite && (
        <Dialogo
          titulo="Convidar alguém"
          texto="Basta o email. O lugar fica feito já — quando essa pessoa entrar pela primeira vez, encontra a app à espera dela."
          confirmar="Convidar"
          ocupado={ocupado}
          aoFechar={() => setConvite(null)}
          aoConfirmar={async () => {
            const feito = await pedir('/api/membros', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(convite),
            });
            if (feito) setConvite(null);
          }}
        >
          <div className="mb-4 space-y-3">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                autoFocus
                value={convite.email}
                onChange={(e) => setConvite({ ...convite, email: e.target.value })}
                placeholder="pessoa@exemplo.com"
              />
            </div>
            <div>
              <label className="label">Nome (opcional)</label>
              <input
                className="input"
                value={convite.nome}
                onChange={(e) => setConvite({ ...convite, nome: e.target.value })}
                placeholder="Para a reconheceres na lista"
              />
            </div>
            <div>
              <label className="label">Papel</label>
              <div className="grid gap-2">
                {PAPEIS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setConvite({ ...convite, papel: p.id })}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      convite.papel === p.id
                        ? 'border-ink bg-superficie shadow-soft'
                        : 'border-sand hover:border-ink/30'
                    }`}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ink/40">
                      {convite.papel === p.id && <span className="h-2 w-2 rounded-full bg-rosa" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{p.nome}</span>
                      <span className="block text-xs leading-relaxed text-muted">
                        {p.descricao}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Dialogo>
      )}

      {aRemover && (
        <Dialogo
          titulo={`Tirar o acesso a ${aRemover.nome ?? aRemover.email}?`}
          texto="Deixa de conseguir entrar na app. O que essa pessoa criou não se apaga — só perde a porta. Podes voltar a convidá-la depois."
          confirmar="Tirar o acesso"
          perigo
          ocupado={ocupado}
          aoFechar={() => setARemover(null)}
          aoConfirmar={async () => {
            const feito = await pedir(`/api/membros?id=${aRemover.id}`, { method: 'DELETE' });
            if (feito) setARemover(null);
          }}
        />
      )}

      {!podeGerir && membros && aba !== 'paginas' && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <Plus className="h-3 w-3 rotate-45" />
          Estás a ver esta página como suporte: podes ver quem tem acesso, mas não mudar papéis.
        </p>
      )}
    </>
  );
}
