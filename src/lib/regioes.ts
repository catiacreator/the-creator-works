/**
 * De onde vêm as notícias.
 * Vive à parte do resto da Última hora porque o ecrã também precisa disto —
 * e o ecrã não pode arrastar consigo o SDK que fala com a Anthropic.
 */
export type Regiao = 'global' | 'brasil' | 'portugal' | 'espanha';

/** O que ela escolheu em Sobre mim → o separador que abre por defeito. */
export function regiaoDoPais(pais?: string | null): Regiao {
  const limpo = (pais ?? '').trim().toLowerCase();
  if (limpo.startsWith('portugal')) return 'portugal';
  if (limpo.startsWith('brasil') || limpo.startsWith('brazil')) return 'brasil';
  if (limpo.startsWith('espanha') || limpo.startsWith('españa')) return 'espanha';
  return 'global';
}

export const REGIOES: Array<{ id: Regiao; label: string; pais: string | null; onde: string }> = [
  {
    id: 'global',
    label: 'Global',
    pais: null,
    onde: 'no mundo inteiro — o que sai primeiro em inglês e ainda não chegou cá',
  },
  {
    id: 'portugal',
    label: 'Portugal',
    pais: 'PT',
    onde: 'em Portugal — o mercado dela, em português de Portugal',
  },
  {
    id: 'brasil',
    label: 'Brasil',
    pais: 'BR',
    onde: 'no Brasil — onde o mercado de conteúdo anda meses à frente',
  },
  {
    id: 'espanha',
    label: 'Espanha',
    pais: 'ES',
    onde: 'em Espanha — mercado vizinho, dá para antecipar o que chega cá',
  },
];
