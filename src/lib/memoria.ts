import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A memória da Cát.IA.
 *
 * O briefing diz quem ela é; a memória diz o que ela já aprendeu a fazer e a
 * não fazer. São coisas diferentes, e por isso vivem em sítios diferentes: o
 * briefing muda de vez em quando, a memória cresce a cada conversa.
 *
 * Quatro tipos, por ordem de peso:
 *  · regra        — ordem dela. Passa à frente de tudo o resto, inclusive do método.
 *  · aprendizagem — o que se percebeu do que resultou (feedback com comentário,
 *                   diagnóstico da semana).
 *  · preferência  — gostos assinalados sem explicação (👍 / 👎 sem comentário).
 *  · estilo       — maneirismos e tom que a app foi reconhecendo.
 */

export type TipoDeMemoria = 'regra' | 'aprendizagem' | 'preferencia' | 'estilo';

export interface Memoria {
  id: string;
  tipo: TipoDeMemoria;
  conteudo: string;
  importancia: number;
  origem: string | null;
  created_at: string;
}

export interface Campanha {
  id: string;
  nome: string;
  descricao: string | null;
  produto: string | null;
  inicio: string;
  fim: string;
  ativa: boolean;
}

export interface Historia {
  id: string;
  titulo: string;
  historia: string;
  created_at: string;
}

/** A ordem por que aparecem no ecrã e no que vai para a IA. */
export const TIPOS: Array<{
  id: TipoDeMemoria;
  nome: string;
  descricao: string;
  cor: string;
  fundo: string;
}> = [
  {
    id: 'regra',
    nome: 'Regras',
    descricao: 'Ordens tuas. A Cát.IA cumpre-as antes de qualquer outra coisa.',
    cor: 'text-rosa',
    fundo: 'bg-rosaSuave/50 border-rosa/30',
  },
  {
    id: 'aprendizagem',
    nome: 'Aprendizagens',
    descricao: 'O que se percebeu do que resultou contigo.',
    cor: 'text-[#B45309]',
    fundo: 'bg-manteiga/50 border-[#E7C98F]',
  },
  {
    id: 'preferencia',
    nome: 'Preferências',
    descricao: 'Formatos e caminhos que costumas escolher.',
    cor: 'text-[#0F766E]',
    fundo: 'bg-[#E6F4F1] border-[#BFE3DC]',
  },
  {
    id: 'estilo',
    nome: 'Estilo',
    descricao: 'Tom de voz e maneirismos reconhecidos no que escreves.',
    cor: 'text-[#7C3AED]',
    fundo: 'bg-[#F3EDFF] border-[#E4D9FF]',
  },
];

export const nomeDoTipo = (t: TipoDeMemoria) => TIPOS.find((x) => x.id === t)?.nome ?? t;

/** ★★★☆☆ */
export const estrelas = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));

/** ativa · agendada · terminada · em pausa — o estado sai das datas. */
export function estadoDaCampanha(c: Campanha): 'ativa' | 'agendada' | 'terminada' | 'pausada' {
  if (!c.ativa) return 'pausada';
  const hoje = new Date().toISOString().slice(0, 10);
  if (c.inicio > hoje) return 'agendada';
  if (c.fim < hoje) return 'terminada';
  return 'ativa';
}

/**
 * O bloco que segue para a IA em cada pedido.
 *
 * Vai enxuto de propósito: as regras inteiras, porque são ordens, e o resto
 * cortado pela importância. Histórias entram só pelo título e primeiras
 * linhas — se ela quiser contar uma, pede-a.
 */
export async function contextoDaMemoria(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const [{ data: memorias }, { data: campanhas }, { data: historias }] = await Promise.all([
    supabase
      .from('memorias')
      .select('tipo, conteudo, importancia')
      .eq('user_id', userId)
      .order('importancia', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('campanhas')
      .select('nome, descricao, produto, inicio, fim, ativa')
      .eq('user_id', userId)
      .eq('ativa', true)
      .order('inicio', { ascending: false })
      .limit(10),
    supabase
      .from('historias')
      .select('titulo, historia')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const partes: string[] = [];

  const regras = (memorias ?? []).filter((m) => m.tipo === 'regra');
  if (regras.length) {
    partes.push(
      [
        '─── REGRAS DELA — cumpre-as antes de tudo o resto ───',
        'Se alguma destas contrariar o método ou o formato pedido, ganha esta.',
        ...regras.map((r) => `· ${r.conteudo}`),
      ].join('\n'),
    );
  }

  const resto = (memorias ?? []).filter((m) => m.tipo !== 'regra');
  if (resto.length) {
    partes.push(
      [
        '─── O QUE JÁ SE SABE DELA ───',
        ...resto.map((m) => `· [${nomeDoTipo(m.tipo as TipoDeMemoria)}] ${m.conteudo}`),
      ].join('\n'),
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const aDecorrer = (campanhas ?? []).filter((c) => c.inicio <= hoje && c.fim >= hoje);
  if (aDecorrer.length) {
    partes.push(
      [
        '─── O QUE ELA ESTÁ A VENDER AGORA ───',
        'Não force a venda em todo o conteúdo; mas quando fizer sentido, aponte para aqui.',
        ...aDecorrer.map(
          (c) =>
            `· ${c.nome}${c.produto ? ` (${c.produto})` : ''} — ${c.descricao ?? 'sem promessa escrita'} [até ${c.fim}]`,
        ),
      ].join('\n'),
    );
  }

  if (historias?.length) {
    partes.push(
      [
        '─── HISTÓRIAS REAIS DELA ───',
        'Quando o formato pedir storytelling, usa uma destas em vez de inventar.',
        ...historias.map((h) => `· ${h.titulo}: ${h.historia.replace(/\s+/g, ' ').slice(0, 400)}`),
      ].join('\n'),
    );
  }

  return partes.length ? partes.join('\n\n') : null;
}
