import { ok, withUser } from '@/lib/api';
import { encrypt, decrypt, maskKey } from '@/lib/crypto';

export const runtime = 'nodejs';

export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: integrations } = await supabase
    .from('integrations')
    .select('provider, expires_at, created_at')
    .eq('user_id', user.id);

  return ok({
    settings: {
      text_model: data?.text_model ?? 'gpt-5',
      render_engine: data?.render_engine ?? 'local',
      brand_voice: data?.brand_voice ?? '',
      openai_key_masked: maskKey(decrypt(data?.openai_key_enc ?? null)),
    },
    integrations: integrations ?? [],
  });
});

export const PATCH = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as {
    openai_key?: string;
    text_model?: string;
    render_engine?: 'local' | 'canva';
    brand_voice?: string;
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.openai_key !== undefined) {
    patch.openai_key_enc = body.openai_key ? encrypt(body.openai_key.trim()) : null;
  }
  for (const key of ['text_model', 'render_engine', 'brand_voice'] as const) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
  return ok();
});

/** Desligar uma integração. */
export const DELETE = withUser(async ({ user, supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  if (!provider) throw new Error('Falta o provider.');
  await supabase.from('integrations').delete().eq('user_id', user.id).eq('provider', provider);
  return ok();
});
