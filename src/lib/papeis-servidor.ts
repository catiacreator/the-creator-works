import type { SupabaseClient } from '@supabase/supabase-js';
import { MATRIZ_PADRAO, type Matriz, type Papel, type Permissao } from './papeis';

/**
 * A tabela dos papéis, como ela a deixou.
 *
 * Se a leitura falhar — migração por correr, base de dados em baixo — volta
 * aos valores de partida em vez de deixar toda a gente sem permissões
 * nenhumas, que seria a maneira mais rápida de trancar a app.
 */
export async function carregarMatriz(supabase: SupabaseClient): Promise<Matriz> {
  try {
    const { data, error } = await supabase.from('papeis').select('id, permissoes');
    if (error || !data?.length) throw error ?? new Error('sem papéis');

    const matriz = { ...MATRIZ_PADRAO };
    for (const linha of data) {
      matriz[linha.id as Papel] = (linha.permissoes ?? []) as Permissao[];
    }
    return matriz;
  } catch {
    return MATRIZ_PADRAO;
  }
}
