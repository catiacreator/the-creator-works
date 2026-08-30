import { ok, withUser } from '@/lib/api';
import { defaultSpec } from '@/lib/render';
import { signedUrls, uploadBuffer, userPath } from '@/lib/storage';
import { FORMATOS, type Formato, type TemplateSpec } from '@/lib/types';

/** Um desenho do editor ou um TemplateSpec clássico. Ambos vivem em `spec`. */
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

export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  const rows = data ?? [];
  const urls = await signedUrls(
    supabase,
    rows.map((t) => t.bg_path).filter((p): p is string => !!p),
  );
  return ok({
    templates: rows.map((t) => ({ ...t, bg_url: t.bg_path ? urls[t.bg_path] ?? null : null })),
  });
});

/**
 * POST multipart:
 *   name, engine, spec (JSON), canva_brand_template_id?, background? (ficheiro)
 * O "background" é a exportação do teu template do Canva sem texto —
 * é isso que faz os PNGs saírem iguais ao desenho original.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  // Do editor visual vem JSON; do ecrã de Templates vem multipart com o fundo.
  if ((request.headers.get('content-type') ?? '').includes('application/json')) {
    const body = (await request.json()) as { name?: string; spec?: unknown };
    const spec = body.spec ?? defaultSpec();
    const { width, height } = medidas(spec);

    const { count } = await supabase
      .from('templates')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name: (body.name ?? '').trim() || 'Template sem nome',
        engine: 'local',
        width,
        height,
        spec,
        is_default: (count ?? 0) === 0,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return ok({ template: data });
  }

  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim() || 'Template sem nome';
  const engine = (String(form.get('engine') ?? 'local') as 'local' | 'canva');
  const specRaw = form.get('spec');
  const spec: TemplateSpec = specRaw ? JSON.parse(String(specRaw)) : defaultSpec();
  const canvaId = String(form.get('canva_brand_template_id') ?? '').trim() || null;

  let bgPath: string | null = null;
  const bg = form.get('background');
  if (bg instanceof File && bg.size > 0) {
    const buffer = Buffer.from(await bg.arrayBuffer());
    const ext = bg.name.split('.').pop()?.toLowerCase() || 'png';
    bgPath = userPath(user.id, 'templates', `${crypto.randomUUID()}.${ext}`);
    await uploadBuffer(supabase, bgPath, buffer, bg.type || 'image/png');
  }

  const { count } = await supabase
    .from('templates')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { data, error } = await supabase
    .from('templates')
    .insert({
      user_id: user.id,
      name,
      engine,
      width: spec.width,
      height: spec.height,
      spec,
      bg_path: bgPath,
      canva_brand_template_id: canvaId,
      is_default: (count ?? 0) === 0,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  return ok({ template: data });
});
