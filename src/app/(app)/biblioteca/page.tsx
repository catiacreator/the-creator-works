'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Camera, FileText, Images, LayoutTemplate, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui';

/**
 * Biblioteca: tudo o que já é teu, num sítio só.
 * Cada cartão diz quantos lá estão dentro — vê-se de relance onde é que há
 * material a mais e fotografias a menos.
 */
const CARTOES = [
  {
    href: '/carrosseis',
    label: 'Carrosséis',
    curto: 'Tudo o que já fizeste, e o que ficou por acabar',
    icone: Images,
    conta: 'carrosseis',
  },
  {
    href: '/templates',
    label: 'Templates',
    curto: 'Os desenhos que a app usa para compor os slides',
    icone: LayoutTemplate,
    conta: 'templates',
  },
  {
    href: '/fotografias',
    label: 'Fotografias',
    curto: 'As tuas imagens, organizadas por pastas',
    icone: Camera,
    conta: 'fotos',
  },
  {
    href: '/material',
    label: 'Materiais',
    curto: 'Os documentos de que a Cát.IA se alimenta',
    icone: FileText,
    conta: 'material',
  },
] as const;

export default function BibliotecaPage() {
  const [contas, setContas] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const [c, t, f, m] = await Promise.all([
        fetch('/api/carousels').then((r) => r.json()),
        fetch('/api/templates').then((r) => r.json()),
        fetch('/api/photos').then((r) => r.json()),
        fetch('/api/sources').then((r) => r.json()),
      ]);
      setContas({
        carrosseis: (c.carousels ?? []).length,
        templates: (t.templates ?? []).length,
        fotos: (f.photos ?? []).length,
        material: (m.sources ?? []).length,
      });
    })();
  }, []);

  return (
    <>
      <PageHeader
        title="Biblioteca"
        subtitle="Tudo o que já é teu: os carrosséis, os desenhos, as fotografias e os documentos."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {CARTOES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col rounded-[1.25rem] border border-sand bg-superficie p-6 transition hover:border-ink/40 hover:shadow-soft"
          >
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-creme text-ink transition group-hover:bg-ink group-hover:text-white">
              <c.icone className="h-5 w-5" strokeWidth={1.8} />
            </span>

            <span className="mb-1.5 flex items-center gap-2 text-[17px] font-semibold tracking-tight">
              {c.label}
              {contas[c.conta] !== undefined && (
                <span className="rounded-full bg-creme px-2 py-0.5 text-[11px] font-medium text-muted">
                  {contas[c.conta]}
                </span>
              )}
            </span>
            <span className="text-sm leading-relaxed text-muted">{c.curto}</span>

            <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted transition group-hover:text-ink">
              abrir <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
