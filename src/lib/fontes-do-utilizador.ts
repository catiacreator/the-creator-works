import type { SupabaseClient } from '@supabase/supabase-js';
import { downloadBuffer } from './storage';
import type { LoadedFont } from './fonts';

/**
 * As fontes que ela carregou, prontas para o motor compor.
 * Ficam em cache por utilizador enquanto o processo viver — um lote de vinte
 * carrosséis não vai buscar o mesmo ficheiro vinte vezes.
 */
const cache = new Map<string, { quando: number; fontes: LoadedFont[] }>();
const VALIDADE = 5 * 60 * 1000;

export async function fontesDoUtilizador(
  supabase: SupabaseClient,
  userId: string,
): Promise<LoadedFont[]> {
  const guardado = cache.get(userId);
  if (guardado && Date.now() - guardado.quando < VALIDADE) return guardado.fontes;

  const { data } = await supabase
    .from('fonts')
    .select('name, weight, storage_path')
    .eq('user_id', userId);

  const fontes: LoadedFont[] = [];
  for (const linha of data ?? []) {
    try {
      fontes.push({
        name: linha.name,
        data: await downloadBuffer(supabase, linha.storage_path),
        weight: (linha.weight || 400) as LoadedFont['weight'],
        style: 'normal',
      });
    } catch {
      // uma fonte que falhe não pode partir o carrossel inteiro
    }
  }

  cache.set(userId, { quando: Date.now(), fontes });
  return fontes;
}
