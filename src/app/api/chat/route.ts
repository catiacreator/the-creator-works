import { ok, withUser } from '@/lib/api';
import { getSettings } from '@/lib/pipeline';
import { contextoDaMemoria } from '@/lib/memoria';
import { contextoDoMaterial } from '@/lib/material';
import { conversa } from '@/lib/ia';
import { signedUrl } from '@/lib/storage';
import { marcarConsumo } from '@/lib/consumo';
import { GUARDA_CONVERSAS, podarConversas } from '@/lib/conversas';

export const runtime = 'nodejs';
export const maxDuration = 180;

export const GET = withUser(async ({ user, supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('thread');

  if (!threadId) {
    // só as que se guardam: as mais antigas já foram apagadas, mas se alguma
    // escapou à poda não vale a pena mostrá-la
    const { data } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(GUARDA_CONVERSAS);
    return ok({ threads: data ?? [], guarda: GUARDA_CONVERSAS });
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

  // antes de criar a conversa: recusada, não deixa uma linha vazia atrás
  await marcarConsumo(supabase, user.email, 'conversa');

  let threadId = body.thread_id;
  if (!threadId) {
    const { data, error } = await supabase
      .from('chat_threads')
      .insert({ user_id: user.id, title: (body.title ?? message).slice(0, 60) })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    threadId = data.id;

    // abriu-se uma conversa nova: as que passaram das dez vão fora, e as
    // mensagens delas atrás (a chave estrangeira está em cascata)
    await podarConversas(supabase, user.id);
  }

  await supabase
    .from('chat_messages')
    .insert({ thread_id: threadId, user_id: user.id, role: 'user', content: message });

  // Só as últimas trocas. Tudo o que vai aqui é reenviado ao modelo a cada
  // resposta, por isso quarenta mensagens numa conversa longa eram quarenta
  // mensagens pagas outra vez — e o princípio de uma conversa raramente
  // ajuda a responder ao que se está a perguntar agora.
  const { data: recentes } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(16);
  const history = (recentes ?? []).slice().reverse();

  const settings = await getSettings(supabase, user.id);

  // o que ela carregou em Material entra como matéria-prima, e o que a
  // Cát.IA já aprendeu dela entra como lei
  //
  // O material é o maior pedaço de todos, e vai inteiro a cada resposta. Na
  // primeira mensagem faz sentido: é aí que ela diz sobre o que quer falar, e
  // as palavras dela escolhem os documentos certos.
  //
  // Nas seguintes — "muda o gancho", "mais curto", "gosto mais do primeiro" —
  // não há palavras que escolham nada, e o que ia eram dezenas de milhares de
  // caracteres de documentos à sorte. Caro, e pior: enche o pedido de ruído.
  // Por isso a partir da segunda vai um orçamento apertado.
  const primeira = history.filter((m) => m.role === 'user').length <= 1;

  const [material, memoria] = await Promise.all([
    contextoDoMaterial(supabase, user.id, message, primeira ? undefined : 5_000),
    contextoDaMemoria(supabase, user.id),
  ]);

  const reply = await conversa({
    settings,
    material: [memoria, material].filter(Boolean).join('\n\n') || null,
    historico: history
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
