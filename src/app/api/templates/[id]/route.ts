import { ok, withUser } from '@/lib/api';
import { removeFiles, uploadBuffer, userPath } from '@/lib/storage';
import { FORMATOS, type Formato, type TemplateSpec } from '@/lib/types';

function medidas(spec: unknown): { width: number; height: number } {
  const s = spec as { kind?: string; formato?: Formato; width?: number; height?: number };
  if (s?.kind === 'editor') {
    const f = FORMATOS[s.formato ?? '3:4'] ?? FORMATOS['3:4'];
    return { width: f.w, height: f.h };
  }
  return { width: s?.width ?? 1080, height: s?.height ?? 1440 };
}

export const runtime = 'nodejs';
export const maxDuration = 60;

export const PATCH = withUser(async ({ user, supabase, request, params }) => {
  const contentType = request.headers.get('content-type') ?? '';
  const patch: Record<string, unknown> = {};

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    if (form.get('name')) patch.name = String(form.get('name'));
    if (form.get('engine')) patch.engine = String(form.get('engine'));
    if (form.get('canva_brand_template_id') !== null) {
      patch.canva_brand_template_id = String(form.get('canva_brand_template_id')) || null;
    }
    const specRaw = form.get('spec');
    if (specRaw) {
      const spec = JSON.parse(String(specRaw)) as TemplateSpec;
      patch.spec = spec;
      patch.width = spec.width;
      patch.height = spec.height;
    }
    const bg = form.get('background');
    if (bg instanceof File && bg.size > 0) {
      const buffer = Buffer.from(await bg.arrayBuffer());
      const ext = bg.name.split('.').pop()?.toLowerCase() || 'png';
      const path = userPath(user.id, 'templates', `${crypto.randomUUID()}.${ext}`);
      await uploadBuffer(supabase, path, buffer, bg.type || 'image/png');
      patch.bg_path = path;
    }
  } else {
    Object.assign(patch, await request.json());
    if (patch.spec) {
      const { width, height } = medidas(patch.spec);
      patch.width = width;
      patch.height = height;
    }
  }

  if (patch.is_default === true) {
    await supabase.from('templates').update({ is_default: false }).eq('user_id', user.id);
  }

  const { data, error } = await supabase
    .from('templates')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return ok({ template: data });
});

export const DELETE = withUser(async ({ user, supabase, params }) => {
  const { data } = await supabase
    .from('templates')
    .select('bg_path')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  if (data?.bg_path) await removeFiles(supabase, [data.bg_path]);
  return ok();
});
