import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { Editor } from '@/components/editor/editor';
import { ehDesignDoEditor } from '@/lib/design-para-spec';
import { specParaDesign } from '@/lib/spec-para-design';
import { defaultSpec } from '@/lib/render';
import type { Formato, Slide, TemplateSpec } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Tela em branco — ou um template, quando vens de `/editor?template=<id>`.
 * Com template, o que guardas volta para o template; sem ele, guardas um
 * rascunho em Carrosséis.
 */
export default async function EditorNovo({
  searchParams,
}: {
  searchParams: { template?: string };
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const id = searchParams.template;
  if (!id) {
    return (
      <div
        className="editor-tema editor-escuro fixed inset-0 left-64 bg-edFundo text-edTexto"
        data-tema="escuro"
      >
        <Editor userId={user.id} />
      </div>
    );
  }

  const supabase = createClient();
  const { data: template } = await supabase
    .from('templates')
    .select('id, name, spec')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!template) redirect('/templates');

  // um template pode estar guardado como desenho do editor ou no formato antigo
  const guardado = template.spec as (TemplateSpec & { kind?: string }) | null;
  const design = ehDesignDoEditor(guardado)
    ? (guardado as unknown as { formato: Formato; slides: Slide[] })
    : specParaDesign({
        spec: (guardado as TemplateSpec) ?? defaultSpec(),
        slides: [{ idx: 0, fields: {} }],
      });

  return (
    <div
      className="editor-tema editor-escuro fixed inset-0 left-64 bg-edFundo text-edTexto"
      data-tema="escuro"
    >
      <Editor
        userId={user.id}
        modo="template"
        projeto={{
          id: template.id,
          nome: template.name,
          formato: design.formato,
          slides: design.slides,
        }}
      />
    </div>
  );
}
