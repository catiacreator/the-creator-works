import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RECADO_SEM_ACESSO, acessoDe } from '@/lib/acesso';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Quem se registou sozinho volta por aqui com o email confirmado e
      // ainda sem lugar: o `signUp` não devolveu sessão, por isso o
      // `registar_me` não chegou a correr. Corre agora. A função não toca em
      // linhas que já existam, por isso para toda a gente o resto é um
      // pedido a mais e nada mudado.
      try {
        await supabase.rpc('registar_me', {
          nome: (data.user?.user_metadata?.full_name as string | undefined) ?? '',
        });
      } catch {
        // sem a migração 030 isto não existe ainda; a conferência a seguir
        // decide na mesma, e quem tiver lugar entra
      }

      // A app é privada: quem não está na lista sai daqui sem sessão.
      if (!(await acessoDe(supabase, data.user?.email))) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?erro=${encodeURIComponent(RECADO_SEM_ACESSO)}`,
        );
      }
      // convite por abrir: primeiro escolhe a palavra-passe, e só depois entra
      const { data: membro } = await supabase
        .from('membros')
        .select('convite_pendente')
        .ilike('email', data.user?.email ?? '')
        .maybeSingle();

      if (membro?.convite_pendente) {
        return NextResponse.redirect(`${origin}/palavra-passe?novo=1`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=1`);
}
