/**
 * A conferência das portas.
 *
 *     npm run verificar-portas
 *
 * O middleware confere, a cada pedido, se quem tem sessão tem lugar. Quem não
 * tem é posto na rua. Está certo — para as páginas de dentro.
 *
 * Mas há caminhos cuja razão de existir é dar lugar a quem ainda não tem, e
 * esses não podem estar atrás dessa conferência. O `/entrar` esteve, e o
 * estrago foi exactamente este: quem chegava com uma sessão velha e sem lugar
 * era expulso ANTES de o bilhete ser lido. Pior — quem tentasse uma vez
 * ficava preso, porque a tentativa seguinte batia na sessão que a primeira
 * deixou. Não havia erro nenhum a apontar para isto: a pessoa via a página de
 * entrada, como se nada tivesse acontecido.
 *
 * Estes testes existem para que a lista não volte a perder uma porta em
 * silêncio. Cada caso nomeia o estrago concreto que a falta dessa porta
 * causaria — porque uma lista sem o porquê é uma lista que alguém apara.
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
  readFileSync(join(aqui, '..', 'src', 'lib', 'portas.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
);
const destino = join(mkdtempSync(join(tmpdir(), 'portas-')), 'portas.mjs');
writeFileSync(destino, outputText);
const { PORTAS, ePorta } = await import(pathToFileURL(destino).href);

const casos = [];
const caso = (nome, fn) => casos.push({ nome, fn });

// ── as portas, e o que a falta de cada uma custa ─────────────
const AS_PORTAS = [
  ['/entrar', 'os alunos do CarouselSnap ficam à porta e o bilhete nunca é lido'],
  ['/admin-login', 'a Cátia fica sem entrada quando o CarouselSnap estiver em baixo'],
  ['/api/admin-login', 'o código da porta de serviço nunca chega a ser conferido'],
  ['/acesso', 'quem tem um código de convite não consegue criar a conta'],
  ['/assinar', 'quem não tem lugar nenhum vai parar ao login em vez de saber onde é a entrada'],
  ['/obrigada', 'quem acaba de pagar na Hotmart vê um login a pedir uma palavra-passe que nunca escolheu'],
  ['/api/porta/verificar', 'as duas apps voltam a precisar de uma pessoa no meio para saber se se entendem'],
];

for (const [caminho, estrago] of AS_PORTAS) {
  caso(`${caminho} passa sempre — senão ${estrago}`, () =>
    ePorta(caminho) ? null : 'não está na lista',
  );
}

// ── o que NÃO é porta ────────────────────────────────────────
//
// A lista é uma abertura na fechadura. Uma página de dentro aqui dentro era
// deixar entrar quem não tem lugar.
const NÃO_SÃO_PORTAS = ['/', '/criar', '/chat', '/biblioteca', '/admin', '/perfil', '/definicoes'];

for (const caminho of NÃO_SÃO_PORTAS) {
  caso(`${caminho} NÃO é porta — fica atrás da fechadura`, () =>
    ePorta(caminho) ? 'está na lista e não devia' : null,
  );
}

// ── o feitio do que se compara ───────────────────────────────
caso('a comparação é exata: /entrar-por-fora não é o /entrar', () =>
  ePorta('/entrar-por-fora') ? 'deixou passar um caminho parecido' : null,
);

caso('uma página por baixo de uma porta não é a porta', () =>
  ePorta('/admin-login/outra-coisa') ? 'deixou passar um caminho por baixo' : null,
);

/**
 * A saída tem de ser sempre uma porta.
 *
 * Se o /sair sair desta lista, o middleware passa a conferi-lo — e quem
 * precisa dele é precisamente quem o middleware não reconhece. A ratoeira
 * volta a fechar-se e ninguém dá por ela até alguém ficar preso.
 */
caso('a saída é uma porta, e tem de continuar a ser', () =>
  ePorta('/sair') ? null : 'o /sair saiu da lista das portas',
);

caso('a lista não tem duplicados', () =>
  new Set(PORTAS).size === PORTAS.length ? null : 'há caminhos repetidos',
);

caso('todas as portas começam por uma barra', () => {
  const mau = PORTAS.filter((p) => !p.startsWith('/'));
  return mau.length ? `sem barra: ${mau.join(', ')}` : null;
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
