'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderPlus, Pencil, Trash2, Upload, X, ZoomIn, Download } from 'lucide-react';
import { Wizard } from '@/components/wizard';
import { Card, Dialogo, Empty, PageHeader, Spinner } from '@/components/ui';
import type { FolderRow, PhotoRow } from '@/lib/types';

type Photo = PhotoRow & { url: string | null };

const SEM_PASTA = '__sem_pasta__';

export default function BibliotecaPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pastas, setPastas] = useState<FolderRow[]>([]);
  const [pasta, setPasta] = useState<string | null>(null);
  const [selecao, setSelecao] = useState<Record<string, boolean>>({});
  const [aRenomear, setARenomear] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aApagar, setAApagar] = useState<string[] | null>(null);
  const [aVer, setAVer] = useState<Photo | null>(null);
  const [pastaAApagar, setPastaAApagar] = useState<FolderRow | null>(null);
  const [nomePasta, setNomePasta] = useState<{ id: string | null; valor: string } | null>(null);

  async function load() {
    const [ph, fo] = await Promise.all([
      fetch('/api/photos').then((r) => r.json()),
      fetch('/api/folders?tipo=foto').then((r) => r.json()),
    ]);
    setPhotos(ph.photos ?? []);
    setPastas(fo.folders ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const visiveis = useMemo(() => {
    if (pasta === null) return photos;
    if (pasta === SEM_PASTA) return photos.filter((p) => !p.folder_id);
    return photos.filter((p) => p.folder_id === pasta);
  }, [photos, pasta]);

  const pastaAtual = pastas.find((f) => f.id === pasta) ?? null;

  const escolhidas = Object.keys(selecao).filter((id) => selecao[id]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append('files', f));
    if (pasta && pasta !== SEM_PASTA) form.append('pasta', pasta);
    const res = await fetch('/api/photos', { method: 'POST', body: form });
    const data = await res.json();
    setBusy(false);
    if (data.error) setError(data.error);
    else load();
  }

  async function patch(id: string, body: { name?: string | null; folder?: string | null }) {
    const res = await fetch(`/api/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) return setError(data.error);
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, ...data.photo, url: p.url } : p)));
  }

  async function eliminar(ids: string[]) {
    setBusy(true);
    for (const id of ids) {
      const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        break;
      }
    }
    setBusy(false);
    setSelecao({});
    setAApagar(null);
    load();
  }

  async function moverEscolhidas(destino: string | null) {
    setBusy(true);
    for (const id of escolhidas) await patch(id, { folder: destino });
    setBusy(false);
    setSelecao({});
  }

  async function gravarPasta(id: string | null, nome: string) {
    if (!nome.trim()) return;
    const data = await (id ? renomear(id, nome.trim()) : criar(nome.trim()));
    if (data?.error) return setError(data.error);
    setNomePasta(null);
  }

  async function criar(nome: string) {
    const data = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, tipo: 'foto' }),
    }).then((r) => r.json());
    if (!data.error) {
      setPastas((f) => [...f, data.folder].sort((a, b) => a.name.localeCompare(b.name, 'pt')));
      setPasta(data.folder.id);
    }
    return data;
  }

  async function renomear(id: string, nome: string) {
    const data = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome }),
    }).then((r) => r.json());
    if (!data.error) {
      setPastas((fs) =>
        fs
          .map((x) => (x.id === id ? data.folder : x))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt')),
      );
    }
    return data;
  }

  async function apagarPasta(f: FolderRow) {
    const data = await fetch(`/api/folders/${f.id}`, { method: 'DELETE' }).then((r) => r.json());
    if (data.error) return setError(data.error);
    setPastas((fs) => fs.filter((x) => x.id !== f.id));
    setPasta(null);
    setPastaAApagar(null);
    load();
  }

  return (
    <>
      <PageHeader
        title="Fotografias"
        subtitle="As fotos que entram nos carrosséis. Carrega, dá nomes, arruma por pastas."
        action={
          <button className="btn-ghost" onClick={() => setNomePasta({ id: null, valor: '' })}>
            <FolderPlus className="h-4 w-4" />
 Nova pasta
          </button>
        }
      />

      <Wizard destaque="fotos" />

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}


      {/* ── ver a fotografia em grande ────────────────── */}
      {aVer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm"
          onClick={() => setAVer(null)}
        >
          <div
            className="flex max-h-full w-full max-w-3xl flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-3 text-paper">
              <span className="truncate text-sm">{aVer.prompt || 'sem nome'}</span>
              <a
                href={aVer.url ?? '#'}
                download
                target="_blank"
                rel="noreferrer"
                title="Transferir"
                className="ml-auto rounded-full bg-white/10 p-2 transition hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => setAVer(null)}
                title="Fechar"
                className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={aVer.url ?? ''}
              alt={aVer.prompt ?? ''}
              className="max-h-[75vh] w-auto self-center rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ── confirmar eliminação ─────────────────────── */}
      {aApagar && (
        <Dialogo
          titulo={aApagar.length === 1 ? 'Apagar esta fotografia?' : `Apagar ${aApagar.length} fotografias?`}
          texto="O ficheiro é removido do teu armazenamento e não há como voltar atrás. Os carrosséis que já a usam ficam sem fotografia de fundo."
          confirmar="Apagar"
          perigo
          ocupado={busy}
          aoConfirmar={() => eliminar(aApagar)}
          aoFechar={() => setAApagar(null)}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {photos
              .filter((p) => aApagar.includes(p.id))
              .slice(0, 8)
              .map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.url ?? ''}
                  alt=""
                  className="h-16 w-14 rounded-lg border border-sand object-cover"
                />
              ))}
            {aApagar.length > 8 && (
              <span className="self-center text-xs text-muted">+{aApagar.length - 8}</span>
            )}
          </div>
        </Dialogo>
      )}

      {/* ── confirmar apagar pasta ───────────────────── */}
      {pastaAApagar && (
        <Dialogo
          titulo={`Apagar a pasta “${pastaAApagar.name}”?`}
          texto={
            photos.filter((p) => p.folder_id === pastaAApagar.id).length
              ? `As ${photos.filter((p) => p.folder_id === pastaAApagar.id).length} fotografias lá dentro não se perdem — ficam sem pasta.`
              : 'A pasta está vazia.'
          }
          confirmar="Apagar pasta"
          perigo
          ocupado={busy}
          aoConfirmar={() => apagarPasta(pastaAApagar)}
          aoFechar={() => setPastaAApagar(null)}
        />
      )}

      {/* ── nome da pasta ────────────────────────────── */}
      {nomePasta && (
        <Dialogo
          titulo={nomePasta.id ? 'Mudar o nome da pasta' : 'Nova pasta'}
          confirmar={nomePasta.id ? 'Mudar o nome' : 'Criar pasta'}
          ocupado={busy}
          aoConfirmar={() => gravarPasta(nomePasta.id, nomePasta.valor)}
          aoFechar={() => setNomePasta(null)}
        >
          <input
            autoFocus
            className="input mb-4"
            placeholder="ex.: Retratos na rua"
            value={nomePasta.valor}
            onChange={(e) => setNomePasta({ ...nomePasta, valor: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') gravarPasta(nomePasta.id, nomePasta.valor);
              if (e.key === 'Escape') setNomePasta(null);
            }}
          />
        </Dialogo>
      )}

      {/* ── pastas ─────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Chip on={pasta === null} onClick={() => setPasta(null)}>
          Todas <span className="opacity-60">{photos.length}</span>
        </Chip>
        {pastas.map((f) => (
          <Chip key={f.id} on={pasta === f.id} onClick={() => setPasta(f.id)}>
            {f.name}{' '}
            <span className="opacity-60">
              {photos.filter((p) => p.folder_id === f.id).length}
            </span>
          </Chip>
        ))}
        <Chip on={pasta === SEM_PASTA} onClick={() => setPasta(SEM_PASTA)}>
          Sem pasta <span className="opacity-60">{photos.filter((p) => !p.folder_id).length}</span>
        </Chip>

        {pastaAtual && (
          <span className="ml-1 flex items-center gap-3 text-xs text-muted">
            <button
              className="inline-flex items-center gap-1 underline hover:text-ink"
              onClick={() => setNomePasta({ id: pastaAtual.id, valor: pastaAtual.name })}
            >
              <Pencil className="h-3 w-3" /> mudar o nome
            </button>
            <button
              className="inline-flex items-center gap-1 underline hover:text-rosa"
              onClick={() => setPastaAApagar(pastaAtual)}
            >
              <Trash2 className="h-3 w-3" /> apagar pasta
            </button>
          </span>
        )}
      </div>

      <Card className="mb-6">
        <h2 className="mb-2 font-medium">
          <Upload className="mr-1.5 inline h-4 w-4 align-[-2px]" />Carregar fotografias
          {pastaAtual && <span className="text-muted"> — para “{pastaAtual.name}”</span>}
        </h2>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => upload(e.target.files)}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:text-paper"
        />
        {busy && (
          <p className="mt-3">
            <Spinner label="A trabalhar…" />
          </p>
        )}
      </Card>

      {/* ── ações em lote ──────────────────────────────── */}
      {escolhidas.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-ink/20 bg-white px-4 py-3 text-sm">
          <strong>{escolhidas.length} escolhidas</strong>
          <select
            className="input !w-auto !py-1 text-sm"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = '';
              if (v === '__nenhuma__') moverEscolhidas(null);
              else if (v) moverEscolhidas(v);
            }}
          >
            <option value="">Mover para…</option>
            {pastas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            <option value="__nenhuma__">— tirar da pasta —</option>
          </select>
          <button className="inline-flex items-center gap-1 underline" onClick={() => setAApagar(escolhidas)}>
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
          <button className="ml-auto underline text-muted" onClick={() => setSelecao({})}>
            limpar
          </button>
        </div>
      )}

      {/* ── grelha ─────────────────────────────────────── */}
      {visiveis.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {visiveis.map((p) => {
            const on = !!selecao[p.id];
            return (
              <figure
                key={p.id}
                className={`group overflow-hidden rounded-2xl border bg-white transition ${
                  on ? 'border-rosa ring-2 ring-rosa/20' : 'border-sand hover:border-rosa/40'
                }`}
              >
                <div className="relative">
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={p.prompt ?? ''}
                      onClick={() => setSelecao({ ...selecao, [p.id]: !on })}
                      className="aspect-[3/4] w-full cursor-pointer object-cover"
                    />
                  ) : (
                    <div className="aspect-[3/4] w-full bg-sand" />
                  )}
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => setSelecao({ ...selecao, [p.id]: e.target.checked })}
                    className="absolute left-2 top-2 h-4 w-4"
                  />

                  <button
                    onClick={() => setAVer(p)}
                    title="Ver em grande"
                    aria-label="Ver em grande"
                    className="absolute right-2 top-2 rounded-full bg-ink/70 p-1.5 text-paper opacity-0 transition hover:bg-ink focus:opacity-100 group-hover:opacity-100"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>

                <figcaption className="space-y-1 p-2">
                  {aRenomear === p.id ? (
                    <input
                      autoFocus
                      className="input !py-1 text-xs"
                      value={rascunho}
                      onChange={(e) => setRascunho(e.target.value)}
                      onBlur={() => {
                        patch(p.id, { name: rascunho });
                        setARenomear(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setARenomear(null);
                      }}
                    />
                  ) : (
                    <button
                      className="block w-full truncate text-left text-xs hover:underline"
                      title="Clica para renomear"
                      onClick={() => {
                        setRascunho(p.prompt ?? '');
                        setARenomear(p.id);
                      }}
                    >
                      {p.prompt || <span className="text-muted">sem nome</span>}
                    </button>
                  )}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                    <select
                      className="min-w-0 max-w-full truncate rounded bg-creme px-1.5 py-0.5 outline-none"
                      value={p.folder_id ?? ''}
                      onChange={(e) => patch(p.id, { folder: e.target.value || null })}
                    >
                      <option value="">sem pasta</option>
                      {pastas.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="ml-auto shrink-0 rounded-lg p-1 text-muted/70 transition hover:bg-rosaSuave hover:text-rosa"
                      title="Eliminar fotografia"
                      onClick={() => setAApagar([p.id])}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      ) : (
        <Empty>
          {pasta ? 'Esta pasta está vazia.' : 'A biblioteca está vazia. Carrega as tuas fotografias aí em cima.'}
        </Empty>
      )}
    </>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={on ? 'chip-on' : 'chip-off'}
    >
      {children}
    </button>
  );
}
