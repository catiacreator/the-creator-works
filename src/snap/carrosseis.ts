'use client';

import { createClient } from '@/lib/supabase/client';
import type { SlideDoDrop } from './drop-content';

/**
 * Os carrosséis guardados.
 *
 * A tabela é a do CarouselSnap, copiada coluna a coluna — daí os nomes em
 * inglês no meio de uma app em português. Está explicado na migração 030: no
 * dia em que os carrosséis antigos dela vierem do Snap para cá, uma tabela
 * com a mesma forma é a diferença entre uma cópia e uma tradução.
 *
 * Escreve-se do browser e não de uma rota: as políticas da tabela já dizem
 * que cada pessoa só vê e só escreve as suas linhas, e uma rota pelo meio
 * não acrescentava segurança nenhuma — acrescentava um sítio onde enganar-se
 * no `user_id`.
 */

export interface CarrosselGuardado {
  id: string;
  title: string;
  carousel_data: SlideDoDrop[];
  palette_id: string | null;
  font_id: string | null;
  slide_format: string | null;
  created_at: string;
}

/** O que vai para a coluna `carousel_data`. */
interface ParaGuardar {
  titulo: string;
  slides: SlideDoDrop[];
  templateId: string;
  c1: string;
  c2: string;
}

/**
 * O título, quando ninguém deu um.
 *
 * Sai do primeiro slide, cortado. Uma lista de "Sem título" não é uma
 * lista — é um problema a acontecer devagar.
 */
export function tituloDe(slides: SlideDoDrop[]): string {
  const primeiro = (slides[0]?.texto_principal || slides[0]?.texto_secundario || '').trim();
  if (!primeiro) return 'Carrossel sem título';
  return primeiro.length > 70 ? `${primeiro.slice(0, 69)}…` : primeiro;
}

export async function guardarCarrossel(o: ParaGuardar): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessão terminada. Entra outra vez.');

  const { data, error } = await supabase
    .from('carousel_history')
    .insert({
      user_id: user.id,
      title: o.titulo.trim() || tituloDe(o.slides),
      carousel_data: o.slides,
      // o template e as duas cores são o que é preciso para o voltar a
      // desenhar igual. Vão nas colunas do Snap que já serviam para isso.
      palette_id: `${o.c1}|${o.c2}`,
      font_id: o.templateId,
      slide_format: '1:1',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function meusCarrosseis(): Promise<CarrosselGuardado[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('carousel_history')
    .select('id, title, carousel_data, palette_id, font_id, slide_format, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as CarrosselGuardado[];
}

/**
 * Apagar é escrever a data, não tirar a linha.
 *
 * É o que o Snap faz, e está certo: um carrossel que levou uma tarde a
 * escrever não deve desaparecer porque alguém carregou no sítio errado.
 */
export async function apagarCarrossel(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('carousel_history')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** O template e as cores com que este carrossel foi desenhado. */
export function desenhoDe(c: CarrosselGuardado): {
  templateId: string | null;
  c1: string | null;
  c2: string | null;
} {
  const [c1, c2] = (c.palette_id ?? '').split('|');
  return {
    templateId: c.font_id || null,
    c1: c1 || null,
    c2: c2 || null,
  };
}
