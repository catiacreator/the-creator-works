/**
 * A conferência da porta de entrada.
 *
 *     npm run verificar-acesso
 *
 * Esta função decide, a cada pedido, se uma pessoa entra. Enganar-se aqui não
 * dá um erro na página: dá alunos a serem postos fora da app, com a sessão
 * destruída e um recado a dizer que não têm acesso — pessoas que estão a
 * pagar.
 *
 * O caso que interessa mais é o menos óbvio: **não conseguir perguntar não é
 * a mesma coisa que a resposta ser não.** Se a base de dados não responde, a
 * app não sabe — e não saber nunca pode contar como não ter lugar.
 *
 * Sem motor de testes: transpila-se com o TypeScript que já cá está.
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const aqui = dirname(fileURLToPath(import.meta.url));
const { outputText } = ts.transpileModule(
  readFileSync(join(aqui, '..', 'src', 'lib', 'acesso.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
);
const destino = join(mkdtempSync(join(tmpdir(), 'acesso-')), 'acesso.mjs');
writeFileSync(destino, outputText);
const { estadoDoAcesso } = await import(pathToFileURL(destino).href);

/**
 * Um Supabase de mentira.
 *
 * `resposta` é o que o `.maybeSingle()` devolve — `{ data }` para uma linha,
 * `{ error }` para uma falha, ou uma função que rebenta, para o caso em que
 * nem chega a haver resposta (rede em baixo, pedido cortado a meio).
 */
function supabaseFalso(resposta) {
  const cadeia = {
    select: () => cadeia,
    ilike: () => cadeia,
    maybeSingle: async () => (typeof resposta === 'function' ? resposta() : resposta),
  };
  return { from: () => cadeia };
}

const HOJE = new Date().toISOString().slice(0, 10);
const ONTEM = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const PARA_O_ANO = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

const ALUNA = 'aluna@exemplo.com';
const DONA = 'catiacreator@gmail.com';

const casos = [];
const caso = (nome, fn) => casos.push({ nome, fn });
const igual = (a, b, o) =>
  a === b ? null : `${o}: era ${JSON.stringify(b)}, deu ${JSON.stringify(a)}`;

/** o que saiu: o papel, ou o motivo de estar fechada */
const leitura = (r) => ('papel' in r ? r.papel : r.motivo);

// ── o caminho normal ─────────────────────────────────────────
caso('uma aluna com lugar entra', async () => {
  const r = await estadoDoAcesso(
    supabaseFalso({ data: { papel: 'aluno', ativo: true, acesso_ate: PARA_O_ANO } }),
    ALUNA,
  );
  return igual(leitura(r), 'aluno', 'leitura');
});

caso('sem prazo nenhum também entra', async () => {
  const r = await estadoDoAcesso(
    supabaseFalso({ data: { papel: 'aluno', ativo: true, acesso_ate: null } }),
    ALUNA,
  );
  return igual(leitura(r), 'aluno', 'leitura');
});

caso('o prazo que acaba hoje ainda vale', async () => {
  const r = await estadoDoAcesso(
    supabaseFalso({ data: { papel: 'aluno', ativo: true, acesso_ate: HOJE } }),
    ALUNA,
  );
  return igual(leitura(r), 'aluno', 'leitura');
});

// ── as portas que se fecham, e fecham bem ────────────────────
caso('sem linha nenhuma, não tem lugar', async () => {
  const r = await estadoDoAcesso(supabaseFalso({ data: null }), ALUNA);
  return igual(leitura(r), 'sem-lugar', 'leitura');
});

caso('uma conta suspensa fica suspensa', async () => {
  const r = await estadoDoAcesso(
    supabaseFalso({ data: { papel: 'aluno', ativo: false, acesso_ate: PARA_O_ANO } }),
    ALUNA,
  );
  return igual(leitura(r), 'suspensa', 'leitura');
});

caso('o prazo de ontem caducou', async () => {
  const r = await estadoDoAcesso(
    supabaseFalso({ data: { papel: 'aluno', ativo: true, acesso_ate: ONTEM } }),
    ALUNA,
  );
  if (leitura(r) !== 'caducada') return `leitura: deu ${leitura(r)}`;
  // a página de renovação mostra o dia, por isso ele tem de vir
  return igual(r.ate, ONTEM, 'o dia em que caducou');
});

caso('sem email, não tem lugar', async () => {
  const r = await estadoDoAcesso(supabaseFalso({ data: null }), null);
  return igual(leitura(r), 'sem-lugar', 'leitura');
});

// ── o caso que motivou tudo isto ─────────────────────────────
//
// Antes, qualquer um destes contava como «não tem lugar» — e «não tem lugar»,
// no middleware, é signOut(). Um segundo mau do Supabase punha todos os
// alunos fora da app.

caso('a base de dados a devolver erro NÃO tira o lugar a ninguém', async () => {
  const r = await estadoDoAcesso(
    supabaseFalso({ error: { message: 'canal fechado' } }),
    ALUNA,
  );
  return igual(leitura(r), 'nao-sei', 'leitura');
});

caso('o pedido a rebentar NÃO tira o lugar a ninguém', async () => {
  const r = await estadoDoAcesso(
    supabaseFalso(() => {
      throw new Error('fetch failed');
    }),
    ALUNA,
  );
  return igual(leitura(r), 'nao-sei', 'leitura');
});

caso('a tabela por criar NÃO tira o lugar a ninguém', async () => {
  const r = await estadoDoAcesso(
    supabaseFalso({ error: { message: 'relation "public.membros" does not exist' } }),
    ALUNA,
  );
  return igual(leitura(r), 'nao-sei', 'leitura');
});

caso('«não sei» nunca se confunde com «não tem lugar»', async () => {
  const semLugar = await estadoDoAcesso(supabaseFalso({ data: null }), ALUNA);
  const naoSei = await estadoDoAcesso(supabaseFalso({ error: { message: 'x' } }), ALUNA);
  return leitura(semLugar) === leitura(naoSei)
    ? 'os dois dão o mesmo — é este o erro que põe os alunos na rua'
    : null;
});

// ── a dona nunca fica fechada fora de casa ───────────────────
caso('a dona entra mesmo com a base de dados em baixo', async () => {
  const r = await estadoDoAcesso(supabaseFalso({ error: { message: 'em baixo' } }), DONA);
  return igual(leitura(r), 'admin', 'leitura');
});

caso('a dona entra mesmo sem linha na tabela', async () => {
  const r = await estadoDoAcesso(supabaseFalso({ data: null }), DONA);
  return igual(leitura(r), 'admin', 'leitura');
});

caso('mas a linha dela manda, quando existe', async () => {
  const r = await estadoDoAcesso(
    supabaseFalso({ data: { papel: 'admin', ativo: false, acesso_ate: null } }),
    DONA,
  );
  return igual(leitura(r), 'suspensa', 'leitura');
});

let maus = 0;
for (const { nome, fn } of casos) {
  let queixa;
  try {
    queixa = await fn();
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
