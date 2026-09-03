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
