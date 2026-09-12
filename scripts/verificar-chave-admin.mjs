/**
 * A conferência da chave da porta de serviço.
 *
 *     npm run verificar-chave-admin
 *
 * Esta é a única entrada nesta app que não precisa de um bilhete do
 * CarouselSnap — e a única coisa que a separa de qualquer pessoa é o que está
 * neste ficheiro a ser testado. Vale a pena provar que o código certo abre,
 * que tudo o que não é ele não abre, e que o resumo guardado não parece com o
 * código nem com o de mais ninguém.
 *
 * Sem motor de testes: transpila-se com o TypeScript que já cá está.
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const aqui = dirname(fileURLToPath(import.meta.url));
const pasta = mkdtempSync(join(tmpdir(), 'chave-admin-'));

/** transpila um ficheiro de `src/lib` para a pasta temporária, como .mjs */
function levar(nome) {
  const { outputText } = ts.transpileModule(
    readFileSync(join(aqui, '..', 'src', 'lib', `${nome}.ts`), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  );
  // os imports entre eles vêm sem extensão; o Node precisa dela
  const destino = join(pasta, `${nome}.mjs`);
  writeFileSync(destino, outputText.replace(/from '\.\/([\w-]+)'/g, "from './$1.mjs'"));
  return destino;
}

levar('limites');
const destino = levar('chave-admin');
const { prepararChave, confereChave, queixaDoCodigo, inventarCodigo, MINIMO } = await import(
  pathToFileURL(destino).href
);

const casos = [];
const caso = (nome, fn) => casos.push({ nome, fn });
/** devolve null quando está bem, ou a queixa quando está mal */
const igual = (a, b, o) => (a === b ? null : `${o}: era ${JSON.stringify(b)}, deu ${JSON.stringify(a)}`);

const CODIGO = 'aBcDe-12345-fGhIj-67890';

// ── abrir e não abrir ────────────────────────────────────────
caso('o código certo abre', () => {
  const { sal, resumo } = prepararChave(CODIGO);
  return igual(confereChave(CODIGO, sal, resumo), true, 'confere');
});

caso('um código errado não abre', () => {
  const { sal, resumo } = prepararChave(CODIGO);
  return igual(confereChave('aBcDe-12345-fGhIj-67891', sal, resumo), false, 'confere');
});

caso('um caractere a mais não abre', () => {
  const { sal, resumo } = prepararChave(CODIGO);
  return igual(confereChave(`${CODIGO}x`, sal, resumo), false, 'confere');
});

caso('maiúsculas e minúsculas contam', () => {
  const { sal, resumo } = prepararChave(CODIGO);
  return igual(confereChave(CODIGO.toLowerCase(), sal, resumo), false, 'confere');
});

caso('o código vazio não abre nada', () => {
  const { sal, resumo } = prepararChave(CODIGO);
  return igual(confereChave('', sal, resumo), false, 'confere');
});

caso('espaços à volta não estragam o código', () => {
  const { sal, resumo } = prepararChave(`  ${CODIGO}  `);
  return igual(confereChave(CODIGO, sal, resumo), true, 'confere');
});

caso('o mesmo código escrito com acentos compostos abre à mesma', () => {
  // "ã" pode chegar como um caractere ou como a+til, conforme o teclado
  const { sal, resumo } = prepararChave('coraç̃ao-do-assunto-42');
  return igual(confereChave('coraç̃ao-do-assunto-42', sal, resumo), true, 'confere');
});

// ── o que fica guardado ──────────────────────────────────────
caso('o resumo não contém o código', () => {
  const { resumo } = prepararChave(CODIGO);
  return resumo.includes(CODIGO) ? 'o código está lá dentro' : null;
});

caso('o mesmo código guardado duas vezes dá resumos diferentes', () => {
  const a = prepararChave(CODIGO);
  const b = prepararChave(CODIGO);
  if (a.sal === b.sal) return 'o sal repetiu-se';
  if (a.resumo === b.resumo) return 'o resumo repetiu-se — não há sal a valer';
  // e mesmo assim as duas abrem
  if (!confereChave(CODIGO, a.sal, a.resumo) || !confereChave(CODIGO, b.sal, b.resumo)) {
    return 'uma das duas deixou de abrir';
  }
  return null;
});

caso('o resumo de uma não abre com o sal de outra', () => {
  const a = prepararChave(CODIGO);
  const b = prepararChave(CODIGO);
  return igual(confereChave(CODIGO, b.sal, a.resumo), false, 'confere');
});

caso('sal ou resumo em falta não abrem', () => {
  const { sal, resumo } = prepararChave(CODIGO);
  if (confereChave(CODIGO, '', resumo)) return 'abriu sem sal';
  if (confereChave(CODIGO, sal, '')) return 'abriu sem resumo';
  if (confereChave(CODIGO, sal, 'não é hexadecimal')) return 'abriu com lixo no resumo';
  return null;
});

// ── o que se deixa guardar ───────────────────────────────────
caso('um código curto é recusado', () => (queixaDoCodigo('abc123') ? null : 'deixou passar'));
caso('um código no limite passa', () => {
  const c = 'abcde12345fg'.slice(0, MINIMO);
  return queixaDoCodigo(c) ? `recusou ${c}: ${queixaDoCodigo(c)}` : null;
});
caso('um código vazio é recusado', () => (queixaDoCodigo('   ') ? null : 'deixou passar'));
caso('um código com espaços é recusado', () =>
  queixaDoCodigo('o meu codigo secreto') ? null : 'deixou passar',
);
caso('um código que se repete é recusado', () =>
  queixaDoCodigo('aaaaaaaaaaaaaaaa') ? null : 'deixou passar',
);

// ── os códigos inventados ────────────────────────────────────
caso('o código inventado serve para ser guardado', () => {
  const c = inventarCodigo();
  const q = queixaDoCodigo(c);
  return q ? `${c}: ${q}` : null;
});

caso('o código inventado abre', () => {
  const c = inventarCodigo();
  const { sal, resumo } = prepararChave(c);
  return igual(confereChave(c, sal, resumo), true, 'confere');
});

caso('dois códigos inventados nunca são iguais', () => {
  const vistos = new Set();
  for (let i = 0; i < 500; i++) vistos.add(inventarCodigo());
  return igual(vistos.size, 500, 'inventados diferentes');
});

caso('o código inventado não tem caracteres que se confundem a ler', () => {
  for (let i = 0; i < 200; i++) {
    const c = inventarCodigo().replace(/-/g, '');
    if (/[0O1Il]/.test(c)) return `saiu ${c}`;
  }
  return null;
});

let maus = 0;
for (const { nome, fn } of casos) {
  let queixa;
  try {
    queixa = fn();
  } catch (e) {
    queixa = `rebentou: ${e.message}`;
  }
  if (queixa) maus++;
  console.log(`${queixa ? 'MAU ' : ' ok '} ${nome}${queixa ? ` → ${queixa}` : ''}`);
}

console.log(
  maus ? `\n${maus} de ${casos.length} casos maus.` : `\nOs ${casos.length} casos passam.`,
);
process.exit(maus ? 1 : 0);
