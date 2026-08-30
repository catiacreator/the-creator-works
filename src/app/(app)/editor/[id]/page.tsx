import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { Editor } from '@/components/editor/editor';
import { defaultSpec } from '@/lib/render';
import { specParaDesign } from '@/lib/spec-para-design';
import { signedUrl } from '@/lib/storage';
import type { Formato, Slide, TemplateSpec } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Abre um carrossel no editor visual.
 * Se foi desenhado à mão, carrega o desenho tal e qual. Se veio da fábrica,
 * converte o template e o texto em elementos editáveis.
 */
export default async function EditorCarrossel({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = createClient();

  const { data: carousel } = await supabase
    .from('carousels')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!carousel) redirect('/carrosseis');

  let design = carousel.design as
    | { kind: 'editor'; formato: Formato; slides: Slide[] }
    | null;

  if (!design) {
    const { data: slides } = await supabase
      .from('slides')
      .select('idx, fields')
      .eq('carousel_id', params.id)
      .order('idx');

    let spec: TemplateSpec = defaultSpec();
    if (carousel.template_id) {
      const { data: tpl } = await supabase
        .from('templates')
        .select('spec')
        .eq('id', carousel.template_id)
        .maybeSingle();
      const guardado = tpl?.spec as (TemplateSpec & { kind?: string }) | undefined;
      // um template do editor já é um desenho — não passa por aqui
      if (guardado && guardado.kind !== 'editor') spec = guardado;
    }

    let fotoUrl: string | null = null;
    if (carousel.photo_id) {
      const { data: foto } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('id', carousel.photo_id)
        .maybeSingle();
      if (foto?.storage_path) fotoUrl = await signedUrl(supabase, foto.storage_path, 60 * 60 * 8);
    }

    design = specParaDesign({
      spec,
      slides: slides ?? [],
      fotoUrl,
      fotoId: carousel.photo_id,
    });
  }

  return (
    <div className="editor-tema editor-escuro fixed inset-0 left-64 bg-edFundo text-edTexto" data-tema="escuro">
      <Editor
        userId={user.id}
        projeto={{
          id: carousel.id,
          nome: carousel.title ?? 'Sem título',
          formato: design.formato,
          slides: design.slides,
        }}
      />
    </div>
  );
}
