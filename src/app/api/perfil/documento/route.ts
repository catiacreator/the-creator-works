import { withUser } from '@/lib/api';
import { documentoMestre } from '@/lib/documento-mestre';
import type { Briefing } from '@/lib/briefing';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** O Documento Mestre, em PDF, com as cores e as letras da casa. */
export const GET = withUser(async ({ user, supabase }) => {
  const { data } = await supabase
    .from('settings')
    .select('briefing')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: perfil } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const briefing = (data?.briefing ?? {}) as Briefing;
  const pdf = await documentoMestre({ briefing, nome: perfil?.full_name ?? null });

  const nome = `documento-mestre-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nome}"`,
      'Cache-Control': 'no-store',
    },
  });
});
