'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, PenTool, Image as ImageIcon, Trash2, FileImage, Presentation } from 'lucide-react';
import { Card, Dialogo, PageHeader, Spinner, StatusPill } from '@/components/ui';
import type { CarouselRow, PhotoRow, SlideRow } from '@/lib/types';

type Slide = SlideRow & { url: string | null };

export default function CarrosselPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [carousel, setCarousel] = useState<CarouselRow | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [photos, setPhotos] = useState<Array<PhotoRow & { url: string | null }>>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aTrocarFoto, setATrocarFoto] = useState(false);
  const [aApagar, setAApagar] = useState(false);
  const zonaFotos = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await fetch(`/api/carousels/${id}`).then((r) => r.json());
    if (data.error) return;
    setCarousel(data.carousel);
    setSlides(data.slides ?? []);
    setCaption(data.carousel.caption ?? '');
    setHashtags(data.carousel.hashtags ?? '');
  }, [id]);

  useEffect(() => {
    load();
    fetch('/api/photos')
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []));
  }, [load]);

  // enquanto estiver a processar, recarrega
  useEffect(() => {
    if (!carousel || ['ready', 'failed'].includes(carousel.status)) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [carousel, load]);

  /** Guarda sozinho — não há botão de guardar nesta página. */
  async function save() {
    setBusy(true);
    await fetch(`/api/carousels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption,
        hashtags,
        slides: slides.map((s) => ({ id: s.id, fields: s.fields })),
      }),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function requeue(step: 'write' | 'image' | 'render') {
    setBusy(true);
    await fetch(`/api/carousels/${id}/rerender?step=${step}`, { method: 'POST' });
    setBusy(false);
    load();
  }

  async function choosePhoto(photoId: string) {
    await fetch(`/api/carousels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_id: photoId }),
    });
    setATrocarFoto(false);
    requeue('render');
  }

  function mudarFotografia() {
    setATrocarFoto(true);
    setTimeout(() => zonaFotos.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/carousels/${id}`, { method: 'DELETE' });
    router.push('/carrosseis');
  }

  if (!carousel) return <Spinner label="A carregar…" />;

  return (
    <>
      <PageHeader
        title={carousel.title}
        subtitle={carousel.topic ?? undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={carousel.status} />

            <div className="relative group">
              <button className="btn-ghost">
                <Download className="h-4 w-4" /> Descarregar
              </button>
              <div className="cartao-claro absolute right-0 top-full z-40 mt-1 hidden w-56 rounded-2xl border border-sand bg-superficie p-1 shadow-soft group-hover:block">
                <a
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-creme"
                  href={`/api/export/${id}`}
                >
                  <FileImage className="h-4 w-4 shrink-0 text-muted" /> PNGs, prontos a publicar
                </a>
                <a
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-creme"
                  href={`/api/export/${id}?formato=pptx`}
                  title="Importa este ficheiro no Canva e o texto continua editável."
                >
                  <Presentation className="h-4 w-4 shrink-0 text-muted" /> PowerPoint, para o Canva
                </a>
              </div>
            </div>

            <Link className="btn-ghost" href={`/editor/${id}`}>
              <PenTool className="h-4 w-4" /> Abrir no editor
            </Link>

            <button className="btn-ghost" onClick={mudarFotografia} disabled={busy}>
              <ImageIcon className="h-4 w-4" /> Mudar fotografia
            </button>

            <button className="btn-ghost text-rosa" onClick={() => setAApagar(true)}>
              <Trash2 className="h-4 w-4" /> Apagar
            </button>

            {saved && <span className="text-xs text-muted">guardado</span>}
          </div>
        }
      />

      {aApagar && (
        <Dialogo
          titulo="Apagar este carrossel?"
          texto="Vão-se os slides compostos e o texto. A fotografia de fundo fica na tua biblioteca. Não há como voltar atrás."
          confirmar="Apagar carrossel"
          perigo
          ocupado={busy}
          aoConfirmar={remove}
          aoFechar={() => setAApagar(false)}
        />
      )}

      {carousel.error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {carousel.error}
        </div>
      )}

      {/* slides */}
      <div className="space-y-4">
        {slides.map((slide, i) => (
          <Card key={slide.id}>
            <div className="grid items-start gap-4 md:grid-cols-[200px_1fr]">
              <div className="self-start overflow-hidden rounded-xl border border-sand">
                {slide.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.url} alt={`Slide ${i + 1}`} className="block w-full" />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center text-xs text-muted">
                    por compor
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted">Slide {i + 1}</p>
                {Object.entries(slide.fields).map(([key, value]) => (
                  <div key={key}>
                    <label className="label">{key}</label>
                    <textarea
                      className="input min-h-[60px]"
                      value={value}
                      onChange={(e) =>
                        setSlides(
                          slides.map((s) =>
                            s.id === slide.id
                              ? { ...s, fields: { ...s.fields, [key]: e.target.value } }
                              : s,
                          ),
                        )
                      }
                      onBlur={save}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* legenda */}
      <Card className="mt-6">
        <h2 className="mb-3 font-medium">Legenda</h2>
        <textarea
          className="input min-h-[140px]"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={save}
        />
        <label className="label mt-3">Hashtags</label>
        <textarea
          className="input min-h-[60px]"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          onBlur={save}
        />
      </Card>

      {/* trocar fotografia */}
      <div ref={zonaFotos} className="scroll-mt-6">
      <Card className={`mt-6 ${aTrocarFoto ? 'border-rosa ring-4 ring-rosa/15' : ''}`}>
        <h2 className="mb-3 font-medium">Trocar a fotografia de fundo</h2>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => choosePhoto(p.id)}
              className={`overflow-hidden rounded-lg border-2 ${
                carousel.photo_id === p.id ? 'border-ink' : 'border-transparent'
              }`}
            >
              {p.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="aspect-[3/4] w-full object-cover" />
              )}
            </button>
          ))}
        </div>
        {photos.length === 0 && (
          <p className="text-sm text-muted">
            A biblioteca está vazia — carrega fotografias em Fotografias.
          </p>
        )}
      </Card>
      </div>
    </>
  );
}
