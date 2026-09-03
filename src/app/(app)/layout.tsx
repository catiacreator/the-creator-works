import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Manutencao } from '@/components/manutencao';
import { VerComo } from '@/components/ver-como';
import { JobRunner } from '@/components/job-runner';
import { acessoDe } from '@/lib/acesso';
import { briefingCompleto, type Briefing } from '@/lib/briefing';
import {
  paginaInicial,
  permissaoDaPagina,
  pode,
  TODAS_AS_PERMISSOES,
  type Papel,
} from '@/lib/papeis';
import { carregarMatriz } from '@/lib/papeis-servidor';
import { PAGINAS, paginaDe, type EstadoDasPaginas } from '@/lib/paginas';
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
  const caminho = headers().get('x-caminho') ?? '';

  // o papel decide o que ela vê; sem papel não se chega aqui (o middleware
  // fecha a porta antes), mas se chegasse ficava sem nada
  const acesso = await acessoDe(supabase, user.email);
  const papel = acesso?.papel ?? null;
  const matriz = await carregarMatriz(supabase);

  /**
   * A lente do "ver como": quem gere pessoas pode espreitar a app pelos olhos
   * de outro papel. Nunca dá mais do que já se tem — só tira.
   */
  const espreitar = cookies().get('ver-como')?.value as Papel | undefined;
  const aEspreitar =
    espreitar && espreitar !== papel && pode(papel, 'gerir-pessoas', matriz) ? espreitar : null;
  const papelVisto = aEspreitar ?? papel;

  const permissoes = TODAS_AS_PERMISSOES.filter(
    (p) => pode(papel, p, matriz) && pode(papelVisto, p, matriz),
  );

  // deixa o rasto para a página de Admin: quem entrou, e quando. Vai por uma
  // função porque as políticas não deixam um aluno escrever na sua linha —
  // se deixassem, ele promovia-se a admin sozinho.
  void supabase.rpc('marcar_acesso').then(() => undefined);

  const { data } = await supabase
    .from('settings')
    .select('briefing')
    .eq('user_id', user.id)
    .maybeSingle();

  /** a admin a espreitar o primeiro dia de quem se acabou de registar */
  const primeiroDia =
    cookies().get('primeiro-dia')?.value === '1' && pode(papel, 'gerir-pessoas', matriz);

  const completo = !primeiroDia && briefingCompleto((data?.briefing ?? {}) as Briefing);
  if (!completo && caminho !== '/perfil') redirect('/perfil');

  // uma página que este papel não pode ver devolve-o ao sítio onde pode estar
  const precisa = permissaoDaPagina(caminho);
  if (precisa && !permissoes.includes(precisa)) redirect(paginaInicial(papelVisto, matriz));

  // as páginas que ela fechou ou pôs em obras. A admin continua a entrar em
  // tudo — é ela que está a mexer lá dentro.
  const { data: linhasDePaginas } = await supabase
    .from('paginas')
    .select('caminho, escondida, manutencao');

  const estadoDasPaginas: EstadoDasPaginas = {};
  for (const linha of linhasDePaginas ?? []) estadoDasPaginas[linha.caminho] = linha;

  const souAdmin = papelVisto === 'admin';
  const aPagina = paginaDe(caminho);
  const estado = aPagina ? estadoDasPaginas[aPagina] : undefined;

  if (estado?.escondida && !souAdmin) redirect(paginaInicial(papelVisto, matriz));

  const emObras = Boolean(estado?.manutencao) && !souAdmin;
  const nomeDaPagina = PAGINAS.find((x) => x.caminho === aPagina)?.nome ?? 'Esta página';

  const escondidas = Object.values(estadoDasPaginas)
    .filter((e) => e.escondida)
    .map((e) => e.caminho);
  const emManutencao = Object.values(estadoDasPaginas)
    .filter((e) => e.manutencao)
    .map((e) => e.caminho);

  return (
    <div className="flex min-h-screen">
      <Nav
        email={user.email}
        bloqueado={!completo}
        permissoes={permissoes}
        escondidas={souAdmin ? [] : escondidas}
        emManutencao={emManutencao}
      />
      <main className="flex-1 overflow-x-hidden bg-paper px-8 pb-12 pt-8">
        <div className="mx-auto max-w-5xl">
          {aEspreitar && <VerComo papel={aEspreitar} />}
          {emObras ? <Manutencao nome={nomeDaPagina} /> : children}
        </div>
      </main>
      <JobRunner />
    </div>
  );
}
