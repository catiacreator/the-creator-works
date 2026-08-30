import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Traz o Material (PDFs, DOCX, textos colados) para dentro da conversa.
 *
 * Mandar tudo não serve: um PDF sozinho enche o contexto do modelo. Então
 * indexam-se todos pelo nome e escolhem-se os mais próximos da pergunta,
 * dentro de um orçamento de caracteres.
 */

const ORCAMENTO = 22_000;

function normaliza(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Palavras com peso — fora artigos, preposições e afins. */
function palavras(texto: string): string[] {
  const vazias = new Set([
    'para','como','isso','isto','esse','essa','este','esta','pelo','pela','mais','menos',
    'quando','onde','porque','sobre','entre','depois','antes','muito','pouco','tudo','nada',
    'que','com','uma','uns','umas','dos','das','nos','nas','por','sem','aos','fazer','ter',
  ]);
  return [...new Set(normaliza(texto).match(/[a-z0-9]{4,}/g) ?? [])].filter((p) => !vazias.has(p));
}

export interface Fonte {
  id: string;
  name: string;
  chars: number;
  content: string | null;
}

/** Quantas das palavras da pergunta aparecem neste documento. */
function pontuacao(fonte: Fonte, chaves: string[]) {
  if (!chaves.length) return 0;
  const alvo = normaliza(`${fonte.name} ${(fonte.content ?? '').slice(0, 20_000)}`);
  let pontos = 0;
  for (const chave of chaves) {
    if (alvo.includes(chave)) pontos += alvo.includes(` ${chave} `) ? 2 : 1;
  }
  // o nome vale mais: se a pergunta cita o documento, é esse que ela quer
  const nome = normaliza(fonte.name);
  for (const chave of chaves) if (nome.includes(chave)) pontos += 5;
  return pontos;
}

export async function contextoDoMaterial(
  supabase: SupabaseClient,
  userId: string,
  pergunta: string,
  /** Orçamento de caracteres. Nos pedidos rápidos convém ser bem mais curto. */
  orcamento = ORCAMENTO,
): Promise<string> {
  const { data } = await supabase
    .from('sources')
    .select('id, name, chars, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);

  const fontes = (data ?? []) as Fonte[];
  if (!fontes.length) return '';

  const chaves = palavras(pergunta);
  const ordenadas = [...fontes]
    .map((f) => ({ f, p: pontuacao(f, chaves) }))
    .sort((a, b) => b.p - a.p);

  // Índice de tudo o que existe — para ela saber o que tem, mesmo o que não coube.
  const indice = fontes
    .map((f) => `· ${f.name} (${f.chars.toLocaleString('pt-PT')} caracteres)`)
    .join('\n');

  const pedacos: string[] = [];
  let gasto = 0;
  for (const { f, p } of ordenadas) {
    if (!f.content) continue;
    // sem palavras em comum, só entram os mais recentes para não ir vazio
    if (chaves.length && p === 0 && pedacos.length >= 2) continue;
    const espaco = orcamento - gasto;
    if (espaco < 800) break;
    const trecho = f.content.slice(0, Math.min(espaco, 9_000)).trim();
    pedacos.push(`### ${f.name}\n${trecho}${f.content.length > trecho.length ? '\n[…continua]' : ''}`);
    gasto += trecho.length;
  }

  if (!pedacos.length) return '';

  return `
─── O MATERIAL DELA ───
Isto é o que ela carregou na secção Material. Usa-o como matéria-prima: os
exemplos, os casos e as palavras dela valem mais do que qualquer coisa que
inventes. Se ela pedir algo que está aqui, cita-o. Se não estiver, diz que não
está — não inventes.

Documentos disponíveis:
${indice}

Trechos relevantes para o que ela está a pedir agora:

${pedacos.join('\n\n')}
─── fim do material ───
`.trim();
}
