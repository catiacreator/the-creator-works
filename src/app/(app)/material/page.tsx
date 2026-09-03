'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Wizard } from '@/components/wizard';
import { Card, Empty, PageHeader, Spinner } from '@/components/ui';
import type { SourceRow } from '@/lib/types';

const KIND_LABEL: Record<string, string> = {
  pdf: 'PDF',
  docx: 'Word',
  txt: 'Texto',
  text: 'Colado',
};

export default function MaterialPage() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch('/api/sources');
    const data = await res.json();
    setSources(data.sources ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append('files', f));
    const res = await fetch('/api/sources', { method: 'POST', body: form });
    const data = await res.json();
    setBusy(false);
    if (data.error) setError(data.error);
    else load();
    if (fileInput.current) fileInput.current.value = '';
  }

  async function addPasted() {
    if (!pasted.trim()) return;
    setBusy(true);
    await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: pasted }),
    });
    setPasted('');
    setBusy(false);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/sources/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <>
      <PageHeader
        title="Material"
        subtitle="O material de onde saem os carrosséis: PDFs, Word ou texto colado. É daqui que a Cát.IA tira os teus exemplos."
      />

      <Wizard destaque="material" />
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="mb-6">
        <Card>
          <h2 className="mb-2 font-medium">Carregar ficheiros</h2>
          <p className="mb-3 text-sm text-muted">PDF, DOCX, TXT ou Markdown. Vários de uma vez.</p>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => upload(e.target.files)}
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:text-paper"
          />
          {busy && (
            <p className="mt-3">
              <Spinner label="A extrair o texto…" />
            </p>
          )}
        </Card>

      </div>

      <Card className="mb-8">
        <h2 className="mb-2 font-medium">Colar texto</h2>
        <textarea
          className="input min-h-[120px]"
          placeholder="Cola aqui perguntas do direct, comentários, notas de uma aula…"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <button className="btn-primary mt-3" onClick={addPasted} disabled={busy || !pasted.trim()}>
          Guardar material
        </button>
      </Card>

      <h2 className="mb-3 text-xl font-semibold tracking-tight">O teu material</h2>
      {sources.length ? (
        <div className="divide-y divide-sand overflow-hidden rounded-2xl border border-sand bg-superficie">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-xs text-muted">
                  {KIND_LABEL[s.kind] ?? s.kind} · {s.chars.toLocaleString('pt-PT')} caracteres
                </p>
              </div>
              <button onClick={() => remove(s.id)} className="text-xs text-muted underline hover:text-rose-700">
                remover
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Ainda não há material. Carrega um PDF ou cola um texto.</Empty>
      )}
    </>
  );
}
