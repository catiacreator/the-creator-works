import { randomUUID } from 'crypto';
import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { createAdminClient } from '@/lib/supabase/admin';
import { migracaoEmFalta } from '@/lib/migracoes';
import {
  EMAIL_DA_CONFERENCIA,
  escreverPassagem,
  lerPassagem,
  marcaDoSegredo,
} from '@/lib/passagem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CODIGO = process.env.CODIGO_CAROUSELSNAP ?? 'CAROUSELSNAP-AUTO';

/**
 * Conferir a porta, passo a passo, sem sair da página.
 *
 * Já havia uma maneira de experimentar a porta, e era má. O `/api/porta/testar`
 * escreve um bilhete e **atira o browser para o /entrar** com ele. Se correr
 * bem, tira a Cátia do Admin e larga-a na app; se correr mal, larga-a no
 * /assinar — a mesma página que uma pessoa qualquer vê, com a mesma frase, e
 * sem lhe dizer qual dos passos falhou.
 *
 * Ou seja: um botão que, exactamente quando há um problema, perde a página e
 * não responde à pergunta.
 *
 * Isto faz o contrário. Corre a mesma corrente de conferências que o /entrar
 * corre, do lado do servidor, e devolve uma lista com o que passou e o que
 * falhou. Não navega para lado nenhum, não mexe na sessão de ninguém, e não
 * dá acesso a ninguém — nem sequer a quem o pede, que já lá está dentro.
 *
 * O que NÃO consegue ver, e é preciso dizê-lo em vez de fingir que sim: o lado
 * do CarouselSnap. Se tudo aqui passar e mesmo assim ninguém entrar, é porque
 * o segredo de lá é outro — e é a marca que responde a isso, sem ninguém
 * mostrar segredo nenhum a ninguém.
 */

interface Passo {
  nome: string;
  ok: boolean;
  /** o que aconteceu, em português */
  detalhe: string;
  /** o que fazer, quando falha */
  arranjo?: string;
}

export const POST = withUser(async ({ user, supabase }) => {
  const acesso = await acessoDe(supabase, user.email);
  if (acesso?.papel !== 'admin') throw new Error('Só a admin confere a porta.');

  const passos: Passo[] = [];
  /** Uma falha pára a corrente: o passo seguinte não teria significado. */
  const falhou = () => passos.some((p) => !p.ok);

  // ── 1. o segredo ────────────────────────────────────────
  const segredo = process.env.PASSAGEM_SEGREDO?.trim();
  passos.push({
    nome: 'O segredo está posto',
    ok: Boolean(segredo),
    detalhe: segredo
      ? `Está, e a marca dele é ${marcaDoSegredo(segredo)}.`
      : 'Não está. Sem ele a porta recusa toda a gente.',
    arranjo:
      'Põe PASSAGEM_SEGREDO na Vercel — a mesma linha que está do lado do CarouselSnap — e faz Redeploy.',
  });

  // ── 2. escrever e ler um bilhete ────────────────────────
  //
  // Prova que a assinatura e a conferência falam a mesma língua. Não prova que
  // o CarouselSnap fala a mesma que nós: isso é a marca.
  if (!falhou() && segredo) {
    const bilhete = escreverPassagem(EMAIL_DA_CONFERENCIA, segredo, { validade: 60 });
    const leitura = lerPassagem(bilhete, segredo);
    passos.push({
      nome: 'Um bilhete escrito aqui é aceite aqui',
      ok: leitura.ok,
      detalhe: leitura.ok
        ? 'É. A assinatura e a conferência batem certo.'
        : `Não é: ${leitura.porque}.`,
      arranjo: 'Isto é uma avaria no código, não na configuração. Diz-me e eu vou lá.',
    });
  }

  // ── 3. a chave de serviço ───────────────────────────────
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!falhou()) {
    passos.push({
      nome: 'A chave de serviço está posta',
      ok: Boolean(chave),
      detalhe: chave
        ? `Está, com ${chave.length} caracteres.`
        : 'Não está. É ela que deixa abrir a sessão sem palavra-passe.',
      arranjo:
        'Vai ao Supabase, Settings → API, copia a service_role, e põe-na na Vercel como SUPABASE_SERVICE_ROLE_KEY. Depois Redeploy.',
    });
  }

  // ── 4. a chave fala mesmo com a base de dados ───────────
  //
  // Ter a variável posta e ela servir são coisas diferentes: uma chave de
  // outro projeto, ou colada cortada, existe e não abre nada.
  if (!falhou() && chave) {
    const admin = createAdminClient();
    const { error } = await admin.from('passagens').select('bilhete').limit(1);
    passos.push({
      nome: 'A chave de serviço abre a base de dados',
      ok: !error,
      detalhe: error ? `Não abre: ${error.message}` : 'Abre. A tabela das passagens responde.',
      arranjo:
        'A chave existe mas não serve — ou é de outro projeto do Supabase, ou foi colada cortada. Copia-a outra vez, inteira, do projeto certo.',
    });
  }

  // ── 5. o código do sistema ──────────────────────────────
  //
  // É ele que autoriza dar lugar. Sem ele activo, tudo o resto pode estar bom
  // e a porta recusa na mesma, no penúltimo passo.
  if (!falhou() && chave) {
    const admin = createAdminClient();
    const { data } = await admin
      .from('codigos')
      .select('ativo, usos, usos_max')
      .ilike('codigo', CODIGO)
      .maybeSingle();

    const vivo = Boolean(data?.ativo);
    passos.push({
      nome: `O código ${CODIGO} está activo`,
      ok: vivo,
      detalhe: !data
        ? 'Não existe na tabela dos códigos.'
        : vivo
          ? `Está. Já deu lugar ${data.usos} ${data.usos === 1 ? 'vez' : 'vezes'}.`
          : 'Existe, mas está desligado.',
      arranjo:
        'É o código que a migração 024 cria. Se não existe, falta correr a 024; se está desligado, liga-o na lista de códigos.',
    });
  }

  // ── 6. gastar um bilhete ────────────────────────────────
  //
  // O passo que mais falha em silêncio, porque depende do código acima E da
  // chave de serviço. Gasta-se um bilhete a sério e tenta-se gastá-lo outra
  // vez: a primeira tem de valer e a segunda não, senão um endereço apanhado
  // no histórico do browser voltava a abrir a porta.
  if (!falhou() && chave) {
    const admin = createAdminClient();
    const numero = randomUUID();
    const gastar = () =>
      admin.rpc('gastar_bilhete', { c: CODIGO, numero, e: EMAIL_DA_CONFERENCIA });

    const { data: primeira, error } = await gastar();
    const { data: segunda } = error ? { data: null } : await gastar();

    const certo = !error && primeira === true && segunda === false;
    passos.push({
      nome: 'Um bilhete gasta-se, e só serve uma vez',
      ok: certo,
      detalhe: error
        ? `Rebentou: ${error.message}`
        : certo
          ? 'Gasta-se à primeira e é recusado à segunda, como tem de ser.'
          : `Respondeu ${String(primeira)} à primeira e ${String(segunda)} à segunda — devia ser true e depois false.`,
      // quando o Supabase se queixa de uma peça que não existe, traduz-se
      // para o ficheiro que a cria, em vez de se deixar o inglês do PostgREST
      arranjo:
        (error ? migracaoEmFalta(error) : null) ??
        'Este é o passo onde a porta esteve encravada um dia inteiro, por um parâmetro com o nome de uma coluna. Se voltar a falhar, diz-me o que está escrito acima.',
    });
  }

  // ── 7. abrir sessão sem palavra-passe ───────────────────
  //
  // O último passo do /entrar, e o que não se consegue adivinhar de fora: a
  // chave de serviço pode abrir tabelas e não ter autorização para mexer em
  // contas. Faz-se para o email de quem está a pedir — não sai email nenhum,
  // `generateLink` só devolve o link — e não muda nada na conta dela.
  if (!falhou() && chave && user.email) {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    });
    const temToken = Boolean(data?.properties?.hashed_token);
    passos.push({
      nome: 'Dá para abrir sessão sem palavra-passe',
      ok: !error && temToken,
      detalhe:
        error || !temToken
          ? `Não dá: ${error?.message ?? 'não veio token nenhum'}`
          : 'Dá. É este o passo que faz a pessoa entrar sem escrever nada.',
      arranjo:
        'A chave de serviço abre tabelas mas não mexe em contas — não é a service_role, é a anon. Vai buscar a certa a Settings → API.',
    });
  }

  const tudoBem = passos.every((p) => p.ok);

  return ok({
    passos,
    tudoBem,
    marca: marcaDoSegredo(),
    /**
     * O veredicto. Não diz «está tudo bem» quando só sabe metade: o lado do
     * CarouselSnap vive noutra conta, noutra app, e daqui não se vê. O que se
     * pode dizer com honestidade é de que lado NÃO está o problema.
     */
    veredicto: tudoBem
      ? 'Este lado está pronto, do princípio ao fim. Se alguém do CarouselSnap continua a não entrar, o que falta é de lá — e a causa mais provável é o segredo lá ser outra linha. Manda-lhes a marca aqui em cima e pede a deles: se forem diferentes, está achado.'
      : 'Há um passo a falhar deste lado. Está em baixo, com o que fazer.',
  });
});
