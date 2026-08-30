import { ok, withUser } from '@/lib/api';
import { uploadBuffer, userPath } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Guarda um carrossel composto no estúdio.
 *
 * Aqui as imagens já vêm feitas do lado do ecrã — o que se guarda é
 * exatamente o que ela viu, sem passar outra vez pelo motor de composição.
 */
export const POST = withUser(async ({ user, supabase, request }) => {
  const body = (await request.json()) as {
    title?: string;
    slides: Array<{ texto: string; imagem: string }>;
  };

  const slides = (body.slides ?? []).filter((s) => s?.imagem?.startsWith('data:image/'));
  if (!slides.length) throw new Error('Não recebi nenhum slide.');

  const { data: carousel, error } = await supabase
    .from('carousels')
    .insert({
      user_id: user.id,
      title: (body.title || 'Carrossel do estúdio').slice(0, 120),
      status: 'rendering',
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const linhas = [];
  for (let i = 0; i < slides.length; i++) {
    const base64 = slides[i].imagem.split(',')[1] ?? '';
    const buffer = Buffer.from(base64, 'base64');
    const caminho = userPath(user.id, 'renders', carousel.id, `${i}.png`);
    await uploadBuffer(supabase, caminho, buffer, 'image/png');
    linhas.push({
      carousel_id: carousel.id,
      idx: i,
      fields: { titulo: slides[i].texto ?? '' },
      render_path: caminho,
    });
  }

  const { error: erroSlides } = await supabase.from('slides').insert(linhas);
  if (erroSlides) throw new Error(erroSlides.message);

  await supabase
    .from('carousels')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', carousel.id);

  return ok({ carousel: { id: carousel.id } });
});
