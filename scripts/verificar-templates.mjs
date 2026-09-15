/**
 * A conferência dos templates do CarouselSnap.
 *
 *     npm run verificar-templates
 *
 * Os 18 templates vieram do Snap inteiros, e vieram com um buraco: metem o
 * texto do slide dentro do HTML sem o escapar.
 *
 *     <p style="...">${slide.title}</p>
 *
 * Um título com `<img src=x onerror=...>` lá dentro executa. No Snap é o
 * texto da própria pessoa no browser dela, e quase nunca dá problema — mas
 * basta um carrossel ser partilhado ou exportado para deixar de ser só dela.
 *
 * A escolha foi não lhes mexer: são da Cátia, e no dia em que forem
 * actualizados a partir do Snap copiam-se por cima sem se ter de lembrar de
 * nada. Quem fecha o buraco é o `limparSlide`, à entrada.
 *
 * Estes casos existem para que isso continue verdade. O primeiro é o mais
 * importante e o mais estranho de ler: prova que o buraco AINDA LÁ ESTÁ nos
 * templates. Se um dia deixar de estar, é porque alguém lhes mexeu — e o
 * teste avisa, para se saber que a cópia deixou de ser cópia.
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const aqui = dirname(fileURLToPath(import.meta.url));
const { outputText } = ts.transpileModule(
  readFileSync(join(aqui, '..', 'src', 'snap', 'templates.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
);
const destino = join(mkdtempSync(join(tmpdir(), 'tpl-')), 'templates.mjs');
writeFileSync(destino, outputText);
const { TEMPLATES, limparSlide } = await import(pathToFileURL(destino).href);

const cfg = { c1: '#111111', c2: '#EE4E8B', font: 'Poppins', bgUrl: null };
const MAU = {
  label: '',
  title: '<img src=x onerror="alert(1)">',
  sub: 'Olá & adeus',
  tag: '01',
};
const BOM = {
  label: '',
  title: 'Três razões para o teu conteúdo não crescer',
  sub: 'A primeira dói',
  tag: '01',
};

const casos = [];
const caso = (nome, fn) => casos.push({ nome, fn });

caso('vieram os 18', () => (TEMPLATES.length === 18 ? null : `vieram ${TEMPLATES.length}`));

caso('os templates continuam a não escapar nada — a cópia continua a ser cópia', () => {
  const cruz = TEMPLATES.filter((t) => !t.render(MAU, cfg).includes('onerror='));
  return cruz.length
    ? `${cruz.length} já escapam: ${cruz.map((t) => t.id).join(', ')}. Alguém lhes mexeu.`
    : null;
});

caso('com limparSlide, nenhum dos 18 deixa passar o onerror', () => {
  const maus = TEMPLATES.filter((t) => t.render(limparSlide(MAU), cfg).includes('onerror="alert'));
  return maus.length ? `passa em: ${maus.map((t) => t.id).join(', ')}` : null;
});

caso('e a marcação aparece como texto, que é o que a pessoa escreveu', () => {
  const maus = TEMPLATES.filter((t) => !t.render(limparSlide(MAU), cfg).includes('&lt;img'));
  return maus.length ? `não aparece em: ${maus.map((t) => t.id).join(', ')}` : null;
});

caso('texto normal sai exactamente igual, com ou sem limpeza', () => {
  const maus = TEMPLATES.filter((t) => t.render(BOM, cfg) !== t.render(limparSlide(BOM), cfg));
  return maus.length
    ? `sai diferente em: ${maus.map((t) => t.id).join(', ')}`
    : null;
});

caso('o & vira entidade uma vez só, sem duplicar', () => {
  const s = limparSlide({ label: '', title: 'a & b', sub: '', tag: '' });
  return s.title === 'a &amp; b' ? null : `deu ${s.title}`;
});

caso('todos os templates têm id e nome', () => {
  const maus = TEMPLATES.filter((t) => !t.id?.trim() || !t.name?.trim());
  return maus.length ? `${maus.length} sem id ou nome` : null;
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
