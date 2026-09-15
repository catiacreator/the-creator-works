/**
 * A conferência do SQL.
 *
 *     npm run verificar-sql
 *
 * Existe por causa de um dia inteiro perdido.
 *
 * A função que gasta os bilhetes da porta do CarouselSnap tinha um parâmetro
 * chamado `bilhete`, e a tabela onde escreve tem uma coluna chamada `bilhete`.
 * Na cláusula `on conflict (bilhete)`, o Postgres tem os dois à frente e não
 * sabe de qual se fala:
 *
 *     column reference "bilhete" is ambiguous     (42702)
 *
 * O que torna isto perigoso não é o erro — é QUANDO ele aparece. O plpgsql só
 * resolve os nomes ao executar, não ao criar. A migração correu sem uma
 * queixa. A função ficou lá. Todos os cartões de diagnóstico a davam por
 * feita, porque estava mesmo feita. E só rebentava no instante em que alguém
 * tentava mesmo entrar — um instante que acontece no browser de outra pessoa,
 * longe de quem podia ler o erro.
 *
 * Nenhum teste de TypeScript apanha isto. Nenhum `next build` apanha isto.
 * Correr a migração não apanha isto. Só apanha quem for ler o SQL à procura,
 * e ninguém vai ler o SQL à procura.
 *
 * Então lê-se aqui, de cada vez.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const pasta = join(aqui, '..', 'supabase', 'migrations');

/** Os nomes dos parâmetros de uma declaração de função. */
function parametros(lista) {
  return lista
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split(/\s+/)[0].toLowerCase())
    .filter((n) => /^[a-z_][a-z0-9_]*$/.test(n));
}

/**
 * Tirar os comentários antes de ler.
 *
 * Sem isto, a primeira coisa que este ficheiro apanhou foi ele próprio: a
 * migração que ARRANJA a avaria explica-a num comentário, com o código mau
 * escrito por extenso, e o scanner leu-o como se fosse código a sério.
 *
 * Um verificador que se queixa da explicação do arranjo ensina depressa a
 * ignorá-lo.
 */
function semComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/**
 * O que já está arranjado noutro sítio.
 *
 * As migrações são história e não se reescrevem: quem construir esta base de
 * dados de raiz vai correr a 024 com a avaria lá dentro e a 029 a seguir a
 * arranjá-la, pela ordem certa. Apagar a avaria da 024 era mentir sobre o que
 * aconteceu, e partir quem já a correu.
 *
 * Mas também não pode ficar a queixar-se para sempre de uma coisa resolvida —
 * um aviso que aparece todos os dias e que se sabe que não interessa é um
 * aviso que deixa de se ler, e o seguinte, o que interessa, desaparece com
 * ele. Fica aqui, com o sítio onde foi arranjada escrito ao lado.
 */
const PERDOADOS = [
  {
    ficheiro: '024_carouselsnap.sql',
    funcao: 'gastar_passagem',
    porque: 'arranjada na 029, que a substitui por gastar_bilhete(c, numero, e)',
  },
];

const perdoado = (ficheiro, funcao) =>
  PERDOADOS.some((p) => p.ficheiro === ficheiro && p.funcao === funcao);

const queixas = [];
const perdoadas = [];
let funcoes = 0;

for (const ficheiro of readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort()) {
  const texto = semComentarios(readFileSync(join(pasta, ficheiro), 'utf8'));

  // cada função, e o corpo dela até ao $$ que a fecha
  const re = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)\)\s*returns[\s\S]*?\$\$([\s\S]*?)\$\$\s*;/gi;

  for (const m of texto.matchAll(re)) {
    const [, nome, lista, corpo] = m;
    funcoes++;
    const params = new Set(parametros(lista));
    if (!params.size) continue;

    // ── o caso que nos custou o dia ─────────────────────────
    //
    // `on conflict (x)` — o `x` é sempre uma coluna. Se houver um parâmetro
    // com o mesmo nome, o Postgres não sabe escolher, e só o diz a correr.
    for (const c of corpo.matchAll(/on\s+conflict\s*\(([^)]*)\)/gi)) {
      for (const coluna of c[1].split(',').map((x) => x.trim().toLowerCase())) {
        if (params.has(coluna)) {
          if (perdoado(ficheiro, nome)) {
            perdoadas.push(`${ficheiro}: ${nome} — ${PERDOADOS.find((p) => p.funcao === nome).porque}`);
            continue;
          }
          queixas.push(
            `${ficheiro}: a função ${nome} tem um parâmetro chamado "${coluna}" e usa ` +
              `on conflict (${coluna}). O Postgres não sabe se falas do parâmetro ou da ` +
              `coluna, e só se queixa ao executar. Dá outro nome ao parâmetro.`,
          );
        }
      }
    }

    // ── e o primo dele ──────────────────────────────────────
    //
    // Num `do update set x = <expressão>`, a tabela de destino está em
    // âmbito: um nome à solta na expressão é a coluna. Com um parâmetro do
    // mesmo nome, ambíguo outra vez. Só se olha para o lado direito, porque
    // o esquerdo é sempre coluna e nunca é ambíguo.
    for (const u of corpo.matchAll(/do\s+update\s+set([\s\S]*?)(?:;|where\s)/gi)) {
      for (const atribuicao of u[1].split(',')) {
        const direita = atribuicao.split('=').slice(1).join('=');
        for (const palavra of direita.matchAll(/(?<![.\w])([a-z_][a-z0-9_]*)/gi)) {
          const n = palavra[1].toLowerCase();
          if (params.has(n)) {
            if (perdoado(ficheiro, nome)) continue;
            queixas.push(
              `${ficheiro}: a função ${nome} usa "${n}" do lado direito de um do update set, ` +
                `e tem um parâmetro com esse nome. Dentro do do update a tabela está em ` +
                `âmbito — qualifica com excluded. ou dá outro nome ao parâmetro.`,
            );
          }
        }
      }
    }
  }
}

for (const q of queixas) console.log(`MAU  ${q}`);
for (const p of new Set(perdoadas)) console.log(` ·   ${p}`);

if (!queixas.length) {
  console.log(` ok  ${funcoes} funções lidas, nenhum nome de parâmetro a chocar com uma coluna.`);
}

console.log(
  queixas.length
    ? `\n${queixas.length} ${queixas.length === 1 ? 'problema' : 'problemas'} no SQL.`
    : '\nO SQL passa.',
);
process.exit(queixas.length ? 1 : 0);
