'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Save } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';

/**
 * Definições.
 *
 * Só o que é dela para mexer: a voz com que a app escreve. As chaves e as
 * ligações vivem no ambiente do servidor — quem usa a app não tem de saber
 * que elas existem, nem tem como as estragar.
 */
interface Settings {
  text_model: string;
  render_engine: 'local' | 'canva';
  brand_voice: string;
}

export default function DefinicoesClient() {
  const params = useSearchParams();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const data = await fetch('/api/settings').then((r) => r.json());
    setSettings(data.settings);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!settings) return;
    setBusy(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  if (!settings) return null;

  const erro = params.get('erro');

  return (
    <>
      <PageHeader title="Definições" subtitle="A voz com que a app escreve por ti." />

      {erro && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {decodeURIComponent(erro)}
        </div>
      )}

      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 font-medium">Voz da marca</h2>
          <label className="label">Como queres que a app escreva</label>
          <textarea
            className="input min-h-[140px]"
            value={settings.brand_voice}
            onChange={(e) => setSettings({ ...settings, brand_voice: e.target.value })}
            placeholder="Português de Portugal, frases curtas, sem jargão, como quem explica a uma amiga…"
          />
          <p className="mt-2 text-xs text-muted">
            Isto entra em tudo o que a app escreve — os carrosséis, os roteiros e as respostas da
            Cát.IA. O resto de quem tu és vive em <strong>Sobre mim</strong>.
          </p>
        </Card>

        <button className="btn-primary w-full" onClick={save} disabled={busy}>
          <Save className="h-4 w-4" />
          {saved ? 'Guardado' : busy ? 'A guardar…' : 'Guardar definições'}
        </button>

        <Card>
          <h2 className="mb-1 font-medium">Palavra-passe</h2>
          <p className="mb-3 text-sm text-muted">
            Para entrares com email e palavra-passe, sem esperar pelo link do email.
          </p>
          <Link href="/palavra-passe" className="btn-ghost w-full">
            <KeyRound className="h-4 w-4" />
            Definir palavra-passe
          </Link>
        </Card>
      </div>
    </>
  );
}
