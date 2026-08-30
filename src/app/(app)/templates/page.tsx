'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wizard } from '@/components/wizard';
import Link from 'next/link';
import { Card, Empty, PageHeader } from '@/components/ui';
import { defaultSpec } from '@/lib/default-spec';
import type { TemplateSpec, TextBox } from '@/lib/types';

/** O `spec` guarda dois formatos: o antigo (caixas numeradas) ou um desenho do editor. */
type SpecGuardado = TemplateSpec & { kind?: 'editor' };

function ehDoEditor(t: { spec?: SpecGuardado | null }) {
  return t.spec?.kind === 'editor';
}

type Template = {
  id: string;
  name: string;
  engine: 'local' | 'canva';
  spec: SpecGuardado;
  bg_path: string | null;
  bg_url: string | null;
  canva_brand_template_id: string | null;
  is_default: boolean;
};

const NEW_SPEC: TemplateSpec = defaultSpec();

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [spec, setSpec] = useState<SpecGuardado>(NEW_SPEC);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bgInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/templates');
    const data = await res.json();
    const todos: Template[] = data.templates ?? [];
    setTemplates(todos);
    // o painel de caixas só sabe ler os templates do formato antigo
    const classicos = todos.filter((t) => !ehDoEditor(t));
    if (!selected && classicos.length) {
      setSelected(classicos[0]);
      setSpec(classicos[0].spec);
    }
  }, [selected]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doEditor = useMemo(() => templates.filter(ehDoEditor), [templates]);
  const classicos = useMemo(() => templates.filter((t) => !ehDoEditor(t)), [templates]);

  // pré-visualização com debounce
  useEffect(() => {
    if (!spec?.boxes?.length || spec.kind === 'editor') return;
    const timer = setTimeout(async () => {
      const res = await fetch('/api/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, bg_path: selected?.bg_path ?? null }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({ error: 'Falha na pré-visualização' }))).error);
        return;
      }
      const blob = await res.blob();
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [spec, selected?.bg_path]);

  async function createTemplate(form: FormData) {
    setBusy(true);
    setError(null);
    form.set('spec', JSON.stringify(NEW_SPEC));
    const res = await fetch('/api/templates', { method: 'POST', body: form });
    const data = await res.json();
    setBusy(false);
    if (data.error) return setError(data.error);
    await load();
    setSelected(data.template);
    setSpec(data.template.spec);
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    const form = new FormData();
    form.set('spec', JSON.stringify(spec));
    form.set('name', selected.name);
    form.set('engine', selected.engine);
    form.set('canva_brand_template_id', selected.canva_brand_template_id ?? '');
    if (bgInput.current?.files?.[0]) form.set('background', bgInput.current.files[0]);
    const res = await fetch(`/api/templates/${selected.id}`, { method: 'PATCH', body: form });
    const data = await res.json();
    setBusy(false);
    if (data.error) setError(data.error);
    else {
      if (bgInput.current) bgInput.current.value = '';
      load();
    }
  }

  function updateBox(index: number, patch: Partial<TextBox>) {
    setSpec({
      ...spec,
      boxes: (spec.boxes ?? []).map((b, i) => (i === index ? { ...b, ...patch } : b)),
    });
  }

  function addBox() {
    setSpec({
      ...spec,
      boxes: [
        ...(spec.boxes ?? []),
        {
          key: `campo${(spec.boxes ?? []).length + 1}`,
          label: 'Novo campo',
          x: 100,
          y: 200 + (spec.boxes ?? []).length * 160,
          width: 880,
          height: 200,
          fontFamily: 'Inter',
          fontSize: 48,
          lineHeight: 1.2,
          color: '#FFFFFF',
          align: 'left',
          weight: 700,
          maxChars: 120,
          scope: 'all',
        },
      ],
    });
  }

  return (
    <>
      <PageHeader
        title="Templates"
        subtitle="Reproduz aqui o teu template do Canva: o fundo exportado sem texto, e as caixas onde o texto entra."
      />

      <Wizard destaque="template" />
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-3 font-medium">Novo template</h2>
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            createTemplate(new FormData(e.currentTarget));
          }}
        >
          <input name="name" className="input" placeholder="Nome (ex.: Carrossel escuro)" required />
          <input
            name="background"
            type="file"
            accept="image/*"
            className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-sand file:px-3 file:py-2 file:text-sm"
          />
          <button className="btn-primary" disabled={busy}>
            Criar
          </button>
          <input type="hidden" name="engine" value="local" />
        </form>
        <p className="mt-2 text-xs text-muted">
          O fundo é a exportação do teu design do Canva <strong>sem texto</strong> (PNG 1080×1440, formato 3:4).
          Fica por cima da fotografia, por isso guarda-o com transparência se quiseres ver a foto.
        </p>
      </Card>

      {doEditor.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-1 font-medium">Desenhados no editor</h2>
          <p className="mb-3 text-sm text-muted">
            Estes vieram do editor visual. Abrem lá para os mudares — arrastando, não
            escrevendo coordenadas.
          </p>
          <div className="flex flex-wrap gap-2">
            {doEditor.map((t) => (
              <Link key={t.id} href={`/editor?template=${t.id}`} className="btn-ghost">
                {t.name}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {classicos.length ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {classicos.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelected(t);
                setSpec(t.spec);
              }}
              className={
                selected?.id === t.id
                  ? 'btn bg-ink px-4 py-2 text-sm text-paper'
                  : 'btn-ghost'
              }
            >
              {t.name}
              {t.is_default && <span className="ml-2 text-[10px] uppercase">padrão</span>}
            </button>
          ))}
        </div>
      ) : (
        <Empty>Cria o primeiro template acima.</Empty>
      )}

      {selected && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* pré-visualização */}
          <div>
            <div className="sticky top-6">
              <div className="overflow-hidden rounded-2xl border border-sand bg-white">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Pré-visualização" className="block w-full" />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center text-sm text-muted">
                    Adiciona uma caixa de texto
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-2">
                <label className="label">Trocar o fundo</label>
                <input
                  ref={bgInput}
                  type="file"
                  accept="image/*"
                  className="w-full text-xs file:mr-2 file:rounded-full file:border-0 file:bg-sand file:px-3 file:py-1.5"
                />
                <button className="btn-primary w-full" onClick={save} disabled={busy}>
                  {busy ? 'A guardar…' : 'Guardar template'}
                </button>
              </div>
            </div>
          </div>

          {/* editor */}
          <div className="space-y-4">
            <Card>
              <h3 className="mb-3 font-medium">Fundo e fotografia</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label">Cor de fundo</label>
                  <input
                    className="input"
                    value={spec.background}
                    onChange={(e) => setSpec({ ...spec, background: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Véu por cima da foto</label>
                  <input
                    className="input"
                    value={spec.overlay?.color ?? ''}
                    onChange={(e) =>
                      setSpec({ ...spec, overlay: { ...spec.overlay, color: e.target.value } })
                    }
                    placeholder="rgba(20,18,16,0.5)"
                  />
                </div>
                <div>
                  <label className="label">A foto entra como</label>
                  <select
                    className="input"
                    value={spec.photo?.mode ?? 'full-bleed'}
                    onChange={(e) =>
                      setSpec({
                        ...spec,
                        photo: { ...(spec.photo ?? { mode: 'full-bleed' }), mode: e.target.value as TemplateSpec['photo']['mode'] },
                      })
                    }
                  >
                    <option value="full-bleed">Fundo inteiro</option>
                    <option value="top">Faixa em cima</option>
                    <option value="bottom">Faixa em baixo</option>
                    <option value="none">Sem fotografia</option>
                  </select>
                </div>
                <div>
                  <label className="label">Numeração dos slides</label>
                  <select
                    className="input"
                    value={spec.pager?.show ? 'sim' : 'nao'}
                    onChange={(e) =>
                      setSpec({
                        ...spec,
                        pager: {
                          show: e.target.value === 'sim',
                          x: spec.pager?.x ?? 900,
                          y: spec.pager?.y ?? 1320,
                          color: spec.pager?.color ?? 'rgba(253,247,228,0.72)',
                          fontSize: spec.pager?.fontSize ?? 30,
                        },
                      })
                    }
                  >
                    <option value="sim">Mostrar 1/7</option>
                    <option value="nao">Esconder</option>
                  </select>
                </div>
              </div>
            </Card>

            {(spec.boxes ?? []).map((box, i) => (
              <Card key={i}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">{box.label}</h3>
                  <button
                    className="text-xs text-muted underline hover:text-rose-700"
                    onClick={() =>
                      setSpec({ ...spec, boxes: (spec.boxes ?? []).filter((_, j) => j !== i) })
                    }
                  >
                    remover
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Field label="Nome interno" value={box.key} onChange={(v) => updateBox(i, { key: v })} />
                  <Field label="Etiqueta" value={box.label} onChange={(v) => updateBox(i, { label: v })} />
                  <Num label="X" value={box.x} onChange={(v) => updateBox(i, { x: v })} />
                  <Num label="Y" value={box.y} onChange={(v) => updateBox(i, { y: v })} />
                  <Num label="Largura" value={box.width} onChange={(v) => updateBox(i, { width: v })} />
                  <Num label="Altura" value={box.height} onChange={(v) => updateBox(i, { height: v })} />
                  <Num label="Tamanho" value={box.fontSize} onChange={(v) => updateBox(i, { fontSize: v })} />
                  <Field label="Cor" value={box.color} onChange={(v) => updateBox(i, { color: v })} />
                  <Field
                    label="Fonte"
                    value={box.fontFamily}
                    onChange={(v) => updateBox(i, { fontFamily: v })}
                  />
                  <div>
                    <label className="label">Peso</label>
                    <select
                      className="input"
                      value={box.weight}
                      onChange={(e) => updateBox(i, { weight: Number(e.target.value) as TextBox['weight'] })}
                    >
                      {[400, 500, 600, 700, 800].map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Alinhamento</label>
                    <select
                      className="input"
                      value={box.align}
                      onChange={(e) => updateBox(i, { align: e.target.value as TextBox['align'] })}
                    >
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Aparece em</label>
                    <select
                      className="input"
                      value={box.scope ?? 'all'}
                      onChange={(e) => updateBox(i, { scope: e.target.value as TextBox['scope'] })}
                    >
                      <option value="all">Todos os slides</option>
                      <option value="first">Só o primeiro</option>
                      <option value="middle">Só os do meio</option>
                      <option value="last">Só o último</option>
                    </select>
                  </div>
                  <Num
                    label="Máx. caracteres"
                    value={box.maxChars ?? 120}
                    onChange={(v) => updateBox(i, { maxChars: v })}
                  />
                </div>
              </Card>
            ))}

            <button className="btn-ghost w-full" onClick={addBox}>
              + Adicionar caixa de texto
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
