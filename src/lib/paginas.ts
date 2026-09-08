/**
 * As páginas do menu, para a admin as poder esconder ou pôr em manutenção.
 *
 * A lista vive aqui e não no menu porque o menu é do lado do cliente e traz
 * ícones atrás; aqui basta o nome e o endereço. Se acrescentares uma página
 * ao menu, acrescenta-a também aqui.
 */
export interface Pagina {
  caminho: string;
  nome: string;
  grupo: string;
}

export const PAGINAS: Pagina[] = [
  { caminho: '/criar', nome: 'Criar', grupo: 'Criar' },
  { caminho: '/criar-carrosseis', nome: 'Criar carrosséis', grupo: 'Carrosséis Creator' },
  { caminho: '/editor', nome: 'Editor', grupo: 'Carrosséis Creator' },
  { caminho: '/biblioteca', nome: 'Biblioteca', grupo: 'Biblioteca' },
  { caminho: '/chat', nome: 'Agente Cát.IA', grupo: 'Trabalho' },
  { caminho: '/memoria', nome: 'Memória da Cát.IA', grupo: 'Trabalho' },
  { caminho: '/ultima-hora', nome: 'Última hora', grupo: 'Trabalho' },
  { caminho: '/analise', nome: 'Análise de perfil', grupo: 'Trabalho' },
  { caminho: '/perfil', nome: 'Sobre mim', grupo: 'Configurações' },
  { caminho: '/definicoes', nome: 'Definições', grupo: 'Configurações' },
];

export interface EstadoDaPagina {
  caminho: string;
  escondida: boolean;
  manutencao: boolean;
}

export type EstadoDasPaginas = Record<string, EstadoDaPagina>;

/** A página a que este endereço pertence — /editor/abc conta como /editor. */
export function paginaDe(caminho: string): string | null {
  const p = PAGINAS.find((x) => caminho === x.caminho || caminho.startsWith(`${x.caminho}/`));
  return p?.caminho ?? null;
}
