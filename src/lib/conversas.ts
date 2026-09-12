import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Quantas conversas se guardam.
 *
 * Dez, e as dez mais recentes. As mais antigas vão sendo apagadas sozinhas —
 * e apagadas mesmo, não escondidas: as mensagens vão atrás delas, porque a
 * chave estrangeira da tabela `chat_messages` está em cascata.
 *
 * É uma decisão deliberada e não uma poupança: uma app que guarda tudo para
 * sempre acaba por ser um sítio onde ninguém encontra nada. O que interessa
 * guardar a sério — a voz, o que resultou — vive na Memória do teu agente, que
 * não se apaga.
 */
export const GUARDA_CONVERSAS = 10;

/** Quantas aparecem na barra lateral, que é só para voltar ao que se estava a fazer. */
export const NA_BARRA = 5;

/**
 * Deitar fora as conversas que passaram do limite.
 *
 * Corre depois de se abrir uma conversa nova, que é o único momento em que o
 * número pode ter subido. Não estoira nada se falhar: uma conversa a mais
 * guardada é melhor do que um pedido recusado por causa da arrumação.
 */
export async function podarConversas(
  supabase: SupabaseClient,
  userId: string,
  guardar: number = GUARDA_CONVERSAS,
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(guardar, guardar + 199);

    if (error || !data?.length) return 0;

    const velhas = data.map((t) => t.id as string);
    await supabase.from('chat_threads').delete().in('id', velhas);
    return velhas.length;
  } catch {
    return 0;
  }
}
