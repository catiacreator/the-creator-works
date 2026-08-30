/**
 * Os estilos do estúdio.
 *
 * Um estilo é tudo o que decide o aspeto de um slide: a cor do fundo, a caixa
 * de texto por cima, a letra e onde a caixa se senta. Vive à parte do render
 * porque tanto o ecrã como a exportação precisam dele.
 */

export interface Estilo {
  id: string;
  nome: string;
  corFundo: string;
  corCaixa: string;
  opacidadeCaixa: number;
  fonte: string;
  tamanho: number;
  /** posição vertical da caixa: 0 = topo, 100 = fundo */
  caixaY: number;
  raio: number;
  /** fixar o tamanho da caixa — não cresce com o texto */
  caixaFixa: boolean;
  /** largura da caixa, em % do slide */
  caixaLargura: number;
  /** altura da caixa, em % do slide (só quando fixa) */
  caixaAltura: number;
}

export const ESTILOS_BASE: Estilo[] = [
  {
    id: 'catia',
    nome: 'Cátia — faixa escura',
    corFundo: '#141010',
    corCaixa: '#141010',
    opacidadeCaixa: 55,
    fonte: 'Advercase',
    tamanho: 22,
    caixaY: 50,
    raio: 0,
    caixaFixa: false,
    caixaLargura: 90,
    caixaAltura: 30,
  },
  {
    id: 'limpo',
    nome: 'Papel',
    corFundo: '#F6F4F1',
    corCaixa: '#FFFFFF',
    opacidadeCaixa: 0,
    fonte: 'Poppins',
    tamanho: 20,
    caixaY: 100,
    raio: 12,
    caixaFixa: false,
    caixaLargura: 90,
    caixaAltura: 26,
  },
  {
    id: 'preto',
    nome: 'Preto',
    corFundo: '#111111',
    corCaixa: '#000000',
    opacidadeCaixa: 0,
    fonte: 'Montserrat',
    tamanho: 20,
    caixaY: 100,
    raio: 0,
    caixaFixa: false,
    caixaLargura: 90,
    caixaAltura: 26,
  },
];

/** Só as que o browser tem mesmo — senão o slide sai com outra letra. */
export const FONTES = [
  'Advercase',
  'Ramdone',
  'Poppins',
  'Montserrat',
  'Oswald',
  'Bebas Neue',
  'Playfair Display',
  'Georgia',
];

export const CORES_FUNDO = ['#141010', '#111111', '#3D2011', '#1e3a8a', '#065f46', '#F6F4F1', '#FFFFFF'];
export const CORES_CAIXA = ['#141010', '#000000', '#FFFFFF', '#EE4E8B', '#F7E3A0'];

export function hexParaRgba(hex: string, alfa: number) {
  const h = hex.replace('#', '');
  const cheio = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(cheio, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa / 100})`;
}

/** Estilos guardados antes de uma opção existir continuam a abrir. */
export function normalizar(e: Partial<Estilo>): Estilo {
  return {
    id: e.id ?? (globalThis.crypto?.randomUUID?.() ?? `e${Date.now()}`),
    nome: e.nome ?? 'Estilo',
    corFundo: e.corFundo ?? '#141010',
    corCaixa: e.corCaixa ?? '#141010',
    opacidadeCaixa: typeof e.opacidadeCaixa === 'number' ? e.opacidadeCaixa : 55,
    fonte: e.fonte ?? 'Advercase',
    tamanho: typeof e.tamanho === 'number' ? e.tamanho : 22,
    caixaY: typeof e.caixaY === 'number' ? e.caixaY : 50,
    raio: typeof e.raio === 'number' ? e.raio : 0,
    caixaFixa: e.caixaFixa === true,
    caixaLargura: typeof e.caixaLargura === 'number' ? e.caixaLargura : 90,
    caixaAltura: typeof e.caixaAltura === 'number' ? e.caixaAltura : 30,
  };
}

/** Texto claro sobre caixa escura, escuro sobre caixa clara. */
export function corDoTexto(e: Estilo) {
  if (e.opacidadeCaixa <= 40) return '#FFFFFF';
  const h = e.corCaixa.replace('#', '');
  const cheio = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(cheio, 16);
  const luz = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luz > 0.6 ? '#141010' : '#FFFFFF';
}
