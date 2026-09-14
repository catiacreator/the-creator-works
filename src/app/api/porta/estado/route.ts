import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { createAdminClient } from '@/lib/supabase/admin';
import { carouselSnap, voltarAoCarouselSnap } from '@/lib/passagem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * O que falta para a porta do CarouselSnap abrir.
 *
 * A ligação entre as duas apps tem quatro peças, e três delas não estão no
 * código: são coisas para pôr no painel da Vercel, correr no Supabase, e
 * construir do lado do Lovable. Enquanto faltar uma, a pessoa que carrega no
 * botão lá acaba na página de entrada desta — e a página de entrada não sabe
 * dizer porquê.
 *
 * Este endereço sabe. Olha para cada peça e diz qual é que não está lá, para
 * a resposta deixar de ser «não funciona» e passar a ser «falta esta».
 *
 * O que não consegue ver é o lado do CarouselSnap: essa peça vive noutra
 * conta, noutra app. O que se pode dizer sobre ela é indireto e está na
 * última linha — se nunca entrou ninguém por aqui, ou o botão não existe, ou
 * não está a chamar isto.
 */

const CODIGO = process.env.CODIGO_CAROUSELSNAP ?? 'CAROUSELSNAP-AUTO';

/** Uma peça da ligação, e o que dizer quando falta. */
interface Peca {
  id: string;
  nome: string;
  feito: boolean;
  /** o que fazer, quando não está feito */
  falta?: string;
}

/**
 * Existe esta tabela?
 *
 * Pergunta-se com a chave de serviço, que passa por cima das políticas: assim
 * um «não» quer mesmo dizer que a tabela não existe, e não que quem pergunta
 * não a pode ler.
 */
async function existeTabela(
  admin: ReturnType<typeof createAdminClient>,
  tabela: string,
  coluna: string,
): Promise<boolean> {
  const { error } = await admin.from(tabela).select(coluna).limit(1);
  return !error;
}

export const GET = withUser(async ({ user, supabase }) => {
  const acesso = await acessoDe(supabase, user.email);
  if (acesso?.papel !== 'admin') throw new Error('Só a admin vê o estado da porta.');

  const segredo = Boolean(process.env.PASSAGEM_SEGREDO?.trim());
  const chaveDeServico = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  /**
   * Porque é que uma variável não está a ser lida.
   *
   * «Falta na Vercel» é verdade e não chega, quando ela está no painel à
   * vista. As três razões possíveis pedem três arranjos diferentes, e sem
   * saber qual é anda-se a tentar à sorte:
   *
   *   não existe          — o nome no painel não é este. Um espaço a mais no
   *                         fim do nome, um underscore a menos, e a Vercel
   *                         guarda uma variável que a app nunca pede.
   *   existe mas vazia    — foi criada e o valor ficou por colar.
   *   existe com N        — está lá. Se o N for pequeno de mais para o que
   *                         devia ser, foi colada cortada ou é a chave errada.
   *
   * Contam-se caracteres, nunca se mostra nenhum. E listam-se os NOMES das
   * variáveis parecidas — que não são segredo — porque é assim que um nome
   * mal escrito aparece: ao lado do certo, escrito de outra maneira.
   */
  function comoEsta(nome: string) {
    const bruta = process.env[nome];
    if (bruta === undefined) return 'não existe neste ambiente';
    if (!bruta.trim()) return 'existe, mas está vazia';
    return `existe, com ${bruta.trim().length} caracteres`;
  }

  const diagnostico = {
    chave: comoEsta('SUPABASE_SERVICE_ROLE_KEY'),
    segredo: comoEsta('PASSAGEM_SEGREDO'),
    // os nomes que lá estão, para um nome mal escrito saltar à vista
    nomes: Object.keys(process.env)
      .filter((n) => /supabase|passagem|carousel/i.test(n))
      .sort(),
  };

  const pecas: Peca[] = [
    {
      id: 'segredo',
      nome: 'PASSAGEM_SEGREDO na Vercel',
      feito: segredo,
      falta:
        'Sem ele a porta não confere bilhete nenhum. Inventa uma linha comprida e aleatória ' +
        '(openssl rand -hex 32) e põe a MESMA nas duas apps: na Vercel deste lado, nos secrets ' +
        'do Supabase do CarouselSnap do outro.',
    },
    {
      id: 'chave',
      nome: 'SUPABASE_SERVICE_ROLE_KEY na Vercel',
      feito: chaveDeServico,
      falta:
        'É ela que deixa abrir a sessão sem email nem palavra-passe. Está no Supabase, em ' +
        'Settings → API, como service_role.',
    },
  ];

  // as migrações. Sem chave de serviço não dá para perguntar com confiança —
  // um «não» podia ser só falta de permissão, e dizer que falta uma migração
  // que já correu manda-a fazer trabalho à toa
  if (chaveDeServico) {
    const admin = createAdminClient();
    const [passagens, consumos, snapId, chaves, stripe, vezes] = await Promise.all([
      existeTabela(admin, 'passagens', 'bilhete'),
      existeTabela(admin, 'consumos', 'acao'),
      existeTabela(admin, 'membros', 'snap_id'),
      existeTabela(admin, 'chaves_admin', 'email'),
      existeTabela(admin, 'membros', 'stripe_cliente'),
      existeTabela(admin, 'consumos', 'vezes_acao'),
    ]);

    pecas.push(
      {
        id: '024',
        nome: '024_carouselsnap.sql no Supabase',
        feito: passagens,
        falta: 'É a migração da porta. Sem ela nenhum bilhete é aceite — é esta a mais urgente.',
      },
      {
        id: '026',
        nome: '026_identidade.sql no Supabase',
        feito: snapId,
        falta:
          'É a que faz a pessoa ser reconhecida pelo id e não pelo email. Sem ela, quem mudar de ' +
          'email do lado de lá aparece aqui como pessoa nova, com a biblioteca vazia.',
      },
      { id: '022', nome: '022_consumos.sql no Supabase', feito: consumos, falta: 'Sem ela não se conta gasto nenhum de créditos.' },
      { id: '023', nome: '023_stripe.sql no Supabase', feito: stripe, falta: 'Sem ela o webhook do Stripe não guarda o cliente.' },
      { id: '025', nome: '025_financeiro.sql no Supabase', feito: vezes, falta: 'Sem ela o separador Financeiro fica sem números.' },
      { id: '027', nome: '027_porta_admin.sql no Supabase', feito: chaves, falta: 'Sem ela a tua entrada por fora (/admin-login) não abre.' },
    );
  }

  // quantas pessoas já entraram por aqui. Zero com tudo o resto pronto é o
  // sinal de que a peça que falta é a do outro lado
  let entradas: number | null = null;
  if (chaveDeServico) {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('passagens')
      .select('bilhete', { count: 'exact', head: true });
    if (!error) entradas = count ?? 0;
  }

  const desteLado = pecas.every((p) => p.feito);

  /**
   * Qual é a base de dados desta app.
   *
   * Parece um pormenor e não é: quem tem vários projetos no Supabase, todos
   * com nomes parecidos, não tem como saber em qual é que corre as migrações.
   * Correr no projeto errado é mexer na base de dados de outra app.
   *
   * O endereço responde a isso sem ambiguidade — o pedaço antes do
   * `.supabase.co` é o identificador do projeto, e aparece em Settings → API
   * de cada um. Não é segredo nenhum: já vai no browser de toda a gente que
   * abre a app.
   */
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const projeto = url.match(/^https?:\/\/([^.]+)\./)?.[1] ?? null;

  return ok({
    pecas,
    entradas,
    desteLado,
    supabase: url || null,
    projeto,
    diagnostico,
    endereco: `/entrar?t=BILHETE`,
    carouselSnap: carouselSnap(),
    voltar: voltarAoCarouselSnap(),
    codigo: CODIGO,
  });
});
