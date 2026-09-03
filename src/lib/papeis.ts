/**
 * Os papéis e o que cada um pode fazer.
 *
 * A app é da Cátia: ela é a admin, e é ela que decide quem mais entra. Há
 * três papéis, e a diferença entre eles é só esta tabela — mexer aqui muda o
 * que cada pessoa vê, no menu e nas páginas.
 */

export type Papel = 'admin' | 'suporte' | 'aluno';

export type Permissao =
  | 'criar' //         criar conteúdo: Criar, Cát.IA, carrosséis, editor, biblioteca
  | 'memoria' //       a memória da Cát.IA
  | 'ultima-hora' //   a pesquisa de notícias
  | 'analise' //       análise de perfis de Instagram
  | 'ver-pessoas' //   ver quem tem acesso
  | 'gerir-pessoas'; // convidar, mudar papéis, tirar acesso

export interface Membro {
  id: string;
  email: string;
  nome: string | null;
  papel: Papel;
  ativo: boolean;
  convite_pendente?: boolean;
  convidado_por: string | null;
  ultimo_acesso: string | null;
  created_at: string;
}

/** O que cada papel pode — a versão de partida, antes de ela mexer. */
export const PAPEIS: Array<{
  id: Papel;
  nome: string;
  descricao: string;
  permissoes: Permissao[];
}> = [
  {
    id: 'admin',
    nome: 'Admin',
    descricao: 'A dona da app. Faz tudo, e decide quem entra.',
    permissoes: ['criar', 'memoria', 'ultima-hora', 'analise', 'ver-pessoas', 'gerir-pessoas'],
  },
  {
    id: 'suporte',
    nome: 'Suporte',
    descricao: 'Ajuda quem usa a app. Vê tudo o que os alunos têm e a lista de pessoas, mas não mexe em papéis.',
    permissoes: ['criar', 'memoria', 'ultima-hora', 'analise', 'ver-pessoas'],
  },
  {
    id: 'aluno',
    nome: 'Aluno',
    descricao: 'Cria conteúdo e ensina a Cát.IA a escrever como ele. Não vê a Última hora, a Análise de perfil nem quem mais tem acesso.',
    permissoes: ['criar', 'memoria'],
  },
];

/** O nome de cada permissão, para se perceber na página de Admin. */
export const NOMES_DAS_PERMISSOES: Record<Permissao, string> = {
  criar: 'Criar conteúdo',
  memoria: 'Memória da Cát.IA',
  'ultima-hora': 'Última hora',
  analise: 'Análise de perfil',
  'ver-pessoas': 'Ver quem tem acesso',
  'gerir-pessoas': 'Convidar e mudar papéis',
};

export const papelPorId = (p: Papel) => PAPEIS.find((x) => x.id === p) ?? PAPEIS[2];

/** Todas as permissões, pela ordem por que aparecem na tabela do Admin. */
export const TODAS_AS_PERMISSOES = Object.keys(NOMES_DAS_PERMISSOES) as Permissao[];

/**
 * A tabela viva: quem pode o quê.
 * Vem da base de dados (a admin edita-a na página de Admin); isto é só o
 * ponto de partida, e a rede se a leitura falhar.
 */
export type Matriz = Record<Papel, Permissao[]>;

export const MATRIZ_PADRAO: Matriz = {
  admin: papelPorId('admin').permissoes,
  suporte: papelPorId('suporte').permissoes,
  aluno: papelPorId('aluno').permissoes,
};

/**
 * Permissões que a admin nunca perde.
 * Sem elas ninguém voltaria a abrir esta página para as devolver.
 */
export const INTOCAVEIS: Record<Papel, Permissao[]> = {
  admin: ['ver-pessoas', 'gerir-pessoas'],
  suporte: [],
  aluno: [],
};

/** A pergunta que se faz em todo o lado. */
export function pode(
  papel: Papel | null | undefined,
  permissao: Permissao,
  matriz: Matriz = MATRIZ_PADRAO,
): boolean {
  if (!papel) return false;
  return (matriz[papel] ?? []).includes(permissao);
}

/**
 * Que permissão é precisa para cada página.
 *
 * O que não estiver aqui está aberto a quem entrou — o Sobre mim, as
 * Definições e a palavra-passe são de toda a gente.
 */
const PORTAS: Array<[string, Permissao]> = [
  ['/criar-carrosseis', 'criar'],
  ['/criar', 'criar'],
  ['/chat', 'criar'],
  ['/editor', 'criar'],
  ['/carrosseis', 'criar'],
  ['/biblioteca', 'criar'],
  ['/templates', 'criar'],
  ['/fotografias', 'criar'],
  ['/material', 'criar'],
  ['/painel', 'criar'],
  ['/memoria', 'memoria'],
  ['/ultima-hora', 'ultima-hora'],
  ['/analise', 'analise'],
  ['/admin', 'ver-pessoas'],
];

export function permissaoDaPagina(caminho: string): Permissao | null {
  const porta = PORTAS.find(([p]) => caminho === p || caminho.startsWith(`${p}/`));
  return porta ? porta[1] : null;
}

/** A primeira página que esta pessoa pode ver. */
export function paginaInicial(
  papel: Papel | null | undefined,
  matriz: Matriz = MATRIZ_PADRAO,
): string {
  if (pode(papel, 'criar', matriz)) return '/criar';
  if (pode(papel, 'ver-pessoas', matriz)) return '/admin';
  return '/perfil';
}
