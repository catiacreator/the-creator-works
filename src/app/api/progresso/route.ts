import { ok, withUser } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Em que ponto está a montagem da app.
 * É o que alimenta os passos guiados nas páginas: cada um sabe se já está
 * feito, e a app deixa de os mostrar quando estiver tudo.
 */
export const GET = withUser(async ({ user, supabase }) => {
  const conta = async (tabela: string) => {
    const { count } = await supabase
      .from(tabela)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    return count ?? 0;
  };

  const { data: settings } = await supabase
    .from('settings')
    .select('perfil')
    .eq('user_id', user.id)
    .maybeSingle();

  const [fotos, templates, material, carrosseis] = await Promise.all([
    conta('photos'),
    conta('templates'),
    conta('sources'),
    conta('carousels'),
  ]);

  const passos = [
    {
      id: 'perfil',
      titulo: 'Diz quem és',
      texto: 'O documento mestre entra em tudo o que a Cát.IA escreve.',
      href: '/perfil',
      feito: Boolean(settings?.perfil?.trim()),
    },
    {
      id: 'fotos',
      titulo: 'Carrega fotografias',
      texto: 'São o fundo dos teus carrosséis.',
      href: '/fotografias',
      feito: fotos > 0,
    },
    {
      id: 'template',
      titulo: 'Desenha o teu template',
      texto: 'Uma vez só. Depois todos os carrosséis saem com a tua cara.',
      href: '/editor',
      feito: templates > 0,
    },
    {
      id: 'material',
      titulo: 'Traz o teu material',
      texto: 'PDFs, notas, respostas do direct — é daqui que saem os temas.',
      href: '/material',
      feito: material > 0,
    },
    {
      id: 'carrossel',
      titulo: 'Faz o primeiro carrossel',
      texto: 'Escreve uma ideia, ou carrega um documento.',
      href: '/criar',
      feito: carrosseis > 0,
    },
  ];

  return ok({
    passos,
    feitos: passos.filter((p) => p.feito).length,
    total: passos.length,
    completo: passos.every((p) => p.feito),
  });
});
