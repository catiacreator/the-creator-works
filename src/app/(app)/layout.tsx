import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { JobRunner } from '@/components/job-runner';
import { briefingCompleto, type Briefing } from '@/lib/briefing';
import { createClient, getUser } from '@/lib/supabase/server';

/**
 * A porta da app.
 *
 * Quem acaba de se registar vai direto ao Sobre mim e fica lá até responder
 * ao que a Cát.IA precisa de saber. Sem isso ela escreveria para toda a gente
 * — que é o mesmo que escrever para ninguém.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();
  const { data } = await supabase
    .from('settings')
    .select('briefing')
    .eq('user_id', user.id)
    .maybeSingle();

  const completo = briefingCompleto((data?.briefing ?? {}) as Briefing);
  const caminho = headers().get('x-caminho') ?? '';
  if (!completo && caminho !== '/perfil') redirect('/perfil');

  return (
    <div className="flex min-h-screen">
      <Nav email={user.email} bloqueado={!completo} />
      <main className="flex-1 overflow-x-hidden bg-paper px-8 pb-12 pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <JobRunner />
    </div>
  );
}
