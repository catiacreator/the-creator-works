/**
 * A conferência dos bilhetes de passagem.
 *
 *     npm run verificar-passagem
 *
 * Um bilhete assinado é a única coisa que abre a porta desta app. Vale a pena
 * provar que ela se fecha a tudo o resto: assinatura trocada, segredo errado,
 * recado mexido depois de assinado, validade esticada, bilhete de ontem.
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
  readFileSync(join(aqui, '..', 'src', 'lib', 'passagem.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
);
const destino = join(mkdtempSync(join(tmpdir(), 'passagem-')), 'passagem.mjs');
writeFileSync(destino, outputText);
const { escreverPassagem, lerPassagem, VALIDADE } = await import(pathToFileURL(destino).href);

const SEGREDO = 'o-segredo-partilhado-das-duas-apps-nunca-no-codigo';
const OUTRO = 'um-segredo-que-nao-e-o-nosso';

const casos = [];
const caso = (nome, deviaEntrar, fn) => casos.push({ nome, deviaEntrar, fn });

// ── o caminho bom ────────────────────────────────────────────
caso('bilhete acabado de fazer', true, () =>
  lerPassagem(escreverPassagem('alguem@exemplo.com', SEGREDO), SEGREDO),
);

caso('bilhete com nome', true, () => {
  const r = lerPassagem(
    escreverPassagem('Alguem@Exemplo.COM', SEGREDO, { nome: 'Alguém' }),
    SEGREDO,
  );
  // o email chega sempre em minúsculas, que é como a tabela o guarda
  if (r.ok && (r.recado.e !== 'alguem@exemplo.com' || r.recado.n !== 'Alguém')) {
    return { ok: false, porque: `email ou nome mal lidos: ${JSON.stringify(r.recado)}` };
  }
  return r;
});

caso('dois bilhetes seguidos têm números diferentes', true, () => {
  const a = lerPassagem(escreverPassagem('a@b.com', SEGREDO), SEGREDO);
  const b = lerPassagem(escreverPassagem('a@b.com', SEGREDO), SEGREDO);
  if (!a.ok || !b.ok) return { ok: false, porque: 'um dos bilhetes não passou' };
  if (a.recado.j === b.recado.j) return { ok: false, porque: 'o mesmo número duas vezes' };
  return a;
});

// ── as tentativas de forjar ──────────────────────────────────
caso('assinado com outro segredo', false, () =>
  lerPassagem(escreverPassagem('intruso@exemplo.com', OUTRO), SEGREDO),
);

caso('recado mexido depois de assinado', false, () => {
  const bom = escreverPassagem('alguem@exemplo.com', SEGREDO);
  const [, assinatura] = bom.split('.');
  const trocado = Buffer.from(
    JSON.stringify({ e: 'intruso@exemplo.com', ate: Math.floor(Date.now() / 1000) + 60, j: 'x'.repeat(20) }),
    'utf8',
  )
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return lerPassagem(`${trocado}.${assinatura}`, SEGREDO);
});

caso('assinatura cortada', false, () => {
  const bom = escreverPassagem('alguem@exemplo.com', SEGREDO);
  return lerPassagem(bom.slice(0, -4), SEGREDO);
});

caso('sem assinatura nenhuma', false, () => {
  const [corpo] = escreverPassagem('alguem@exemplo.com', SEGREDO).split('.');
  return lerPassagem(corpo, SEGREDO);
});

caso('bilhete vazio', false, () => lerPassagem('', SEGREDO));
caso('bilhete que é lixo', false, () => lerPassagem('isto.nao-e-um-bilhete', SEGREDO));

caso('bilhete de ontem', false, () =>
  lerPassagem(escreverPassagem('alguem@exemplo.com', SEGREDO, { validade: -86400 }), SEGREDO),
);

caso('validade esticada para um ano', false, () =>
  lerPassagem(
    escreverPassagem('alguem@exemplo.com', SEGREDO, { validade: 60 * 60 * 24 * 365 }),
    SEGREDO,
  ),
);

caso('sem email', false, () => {
  // um recado assinado como deve ser, mas sem a única coisa que interessa
  const r = lerPassagem(escreverPassagem('nao-e-um-email', SEGREDO), SEGREDO);
  return r;
});

caso('a app sem segredo configurado não deixa entrar ninguém', false, () =>
  lerPassagem(escreverPassagem('alguem@exemplo.com', SEGREDO), ''),
);

let maus = 0;
for (const { nome, deviaEntrar, fn } of casos) {
  let r;
  try {
    r = fn();
  } catch (e) {
    r = { ok: false, porque: `rebentou: ${e.message}` };
  }
  const certo = r.ok === deviaEntrar;
  if (!certo) maus++;
  const marca = certo ? ' ok ' : 'MAU ';
  const detalhe = r.ok ? 'entra' : `não entra (${r.porque})`;
  console.log(`${marca} ${nome} → ${detalhe}`);
}

console.log(
  maus ? `\n${maus} de ${casos.length} casos maus.` : `\nOs ${casos.length} casos passam. Validade: ${VALIDADE}s.`,
);
process.exit(maus ? 1 : 0);
