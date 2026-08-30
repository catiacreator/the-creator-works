import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';
import { contextoDoMaterial } from '@/lib/material';
import { conversa } from '@/lib/ia';
import { signedUrl } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 180;

export const GET = withUser(async ({ user, supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('thread');

  if (!threadId) {
    const { data } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return ok({ threads: data ?? [] });
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, photo_id, created_at')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .order('created_at');

  const photoIds = (messages ?? []).map((m) => m.photo_id).filter((p): p is string => !!p);
  const photos: Record<string, string | null> = {};
  if (photoIds.length) {
    const { data: rows } = await supabase
      .from('photos')
      .select('id, storage_path')
      .in('id', photoIds);
    for (const row of rows ?? []) {
      photos[row.id] = await signedUrl(supabase, row.storage_path);
    }
  }

  return ok({
    messages: (messages ?? []).map((m) => ({
      ...m,
      photo_url: m.photo_id ? photos[m.photo_id] ?? null : null,
    })),
  });
});

/** Envia uma mensagem e devolve a resposta. */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as {
    thread_id?: string;
    message: string;
    /** Etiqueta da conversa quando ela vem do ecrã Criar: "Reels · Crescimento · Série". */
    title?: string;
  };
  const message = (body.message ?? '').trim();
  if (!message) throw new Error('Mensagem vazia.');

  let threadId = body.thread_id;
  if (!threadId) {
    const { data, error } = await supabase
      .from('chat_threads')
      .insert({ user_id: user.id, title: (body.title ?? message).slice(0, 60) })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    threadId = data.id;
  }

  await supabase
    .from('chat_messages')
    .insert({ thread_id: threadId, user_id: user.id, role: 'user', content: message });

  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('thread_id', threadId)
    .order('created_at')
    .limit(40);

  const settings = await getSettings(supabase, user.id);

  // o que ela carregou em Material entra como matéria-prima
  const material = await contextoDoMaterial(supabase, user.id, message);

  const reply = await conversa({
    settings,
    material,
    historico: (history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  });

  const { data: saved } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      user_id: user.id,
      role: 'assistant',
      content: reply,
    })
    .select('id, role, content, photo_id, created_at')
    .single();

  return ok({ thread_id: threadId, message: { ...saved, photo_url: null } });
});

/** Apaga uma conversa e tudo o que lá está dentro. */
export const DELETE = withUser(async ({ user, supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('thread');
  if (!threadId) throw new Error('Falta a conversa a apagar.');

  await supabase
    .from('chat_messages')
    .delete()
    .eq('thread_id', threadId)
    .eq('user_id', user.id);

  const { error } = await supabase
    .from('chat_threads')
    .delete()
    .eq('id', threadId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  return ok({ removed: threadId });
});
