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

/**
 * As funções `security definer` que PODEM estar abertas a quem não tem sessão.
 *
 * Uma função `security definer` corre como dona das tabelas: passa por cima
 * das políticas de segurança. Dá-la a `anon` é deixá-la ao alcance de
 * qualquer pessoa da internet — e o argumento «mas ela pede um código» não
 * chega, porque os códigos de sistema estão escritos neste repositório, que é
 * público.
 *
 * Foi assim que o `renovar_acesso` esteve meses a poder ser chamado por
 * qualquer pessoa: punha `acesso_ate` onde se quisesse e `ativo = true`. Quem
 * tivesse deixado de pagar renovava-se de graça.
 *
 * Estas duas são de propósito, e têm de ser: a página /acesso é onde alguém
 * sem conta nenhuma resgata um convite, e o browser dela fala como `anon`. O
 * `resgatar_codigo` tem lá dentro a guarda que falta às outras — para códigos
 * de sistema, exige a chave de serviço.
 *
 * Acrescentar um nome a esta lista é dizer «eu sei o que isto abre». Não se
 * acrescenta para calar o aviso.
 */
const ABERTAS_DE_PROPOSITO = new Set(['codigo_valido', 'resgatar_codigo']);

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

// ── quem está aberto a quem não tem sessão ───────────────────
//
// Percorre-se outra vez, agora à procura de grants. Uma passagem à parte
// porque um `grant` pode estar longe da função que nomeia — noutro ficheiro,
// até: a 024 volta a dar permissões a funções nascidas na 018.
const definidoras = new Set();
for (const ficheiro of readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort()) {
  const texto = semComentarios(readFileSync(join(pasta, ficheiro), 'utf8'));
  for (const m of texto.matchAll(
    /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)[\s\S]*?\$\$/gi,
  )) {
    const corpo = texto.slice(m.index, m.index + 400);
    if (/security\s+definer/i.test(corpo)) definidoras.add(m[1].toLowerCase());
  }
}

/**
 * As que já não existem.
 *
 * Uma função dropada não está aberta a ninguém — não está de todo. Sem isto,
 * o aviso ficava para sempre a apontar para a `gastar_passagem`, que a 029
 * apaga: um aviso sobre uma coisa que não existe é a maneira mais rápida de
 * ensinar alguém a ignorar os que existem.
 */
const dropadas = new Set();
for (const ficheiro of readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort()) {
  const texto = semComentarios(readFileSync(join(pasta, ficheiro), 'utf8'));
  for (const m of texto.matchAll(/drop\s+function\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)/gi)) {
    dropadas.add(m[1].toLowerCase());
  }
}

/** O último grant ou revoke de cada função é o que vale. */
const abertura = new Map();
for (const ficheiro of readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort()) {
  const texto = semComentarios(readFileSync(join(pasta, ficheiro), 'utf8'));
  for (const m of texto.matchAll(
    /(grant|revoke)\s+(?:execute|all)[\s\S]{0,40}?on\s+function\s+(?:public\.)?(\w+)\s*\([^)]*\)\s*(?:to|from)\s+([^;]+);/gi,
  )) {
    const [, verbo, nome, quem] = m;
    if (!/\banon\b/i.test(quem)) continue;
    abertura.set(nome.toLowerCase(), { aberta: verbo.toLowerCase() === 'grant', ficheiro });
  }
}

for (const [nome, { aberta, ficheiro }] of abertura) {
  if (!aberta) continue;
  if (!definidoras.has(nome)) continue;
  if (dropadas.has(nome)) continue;
  if (ABERTAS_DE_PROPOSITO.has(nome)) continue;
  queixas.push(
    `${ficheiro}: ${nome} é security definer e está dada a anon — qualquer pessoa da ` +
      `internet, sem sessão, pode chamá-la. Os códigos de sistema que ela pede estão neste ` +
      `repositório, que é público. Revoga de anon e dá a service_role, ou diz porque não em ` +
      `ABERTAS_DE_PROPOSITO.`,
  );
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
