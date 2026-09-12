/**
 * Os casos de que o leitor da Fábrica se tem de lembrar.
 *
 *     npm run verificar-leitor
 *
 * Cada caso é um documento como os que aparecem mesmo — o que sai do ChatGPT,
 * o que sai de um PDF, o que sai de um Word que perdeu as linhas em branco —
 * e o número de carrosséis que lá estão. O leitor já se enganou duas vezes
 * neste sítio; isto é para não haver terceira.
 *
 * Não há aqui nenhum motor de testes: transpila-se o ficheiro com o
 * TypeScript que já está instalado e corre-se. Sem dependências novas.
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = join(aqui, '..', 'src', 'lib', 'fabrica-extrair.ts');

const { outputText } = ts.transpileModule(readFileSync(fonte, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const destino = join(mkdtempSync(join(tmpdir(), 'leitor-')), 'fabrica-extrair.mjs');
writeFileSync(destino, outputText);
const { extrairDoTexto } = await import(pathToFileURL(destino).href);

/** @type {Array<{nome: string, porque: string, carrosseis: number, slides?: number, primeiro?: string, texto: string}>} */
const CASOS = [
  {
    nome: 'A',
    porque: 'títulos em CARROSSEL n, o feitio mais comum',
    carrosseis: 3,
    texto: `
CARROSSEL 1 — Como começar
Slide 1: O primeiro passo é o mais difícil
Slide 2: Mas não tem de ser
Slide 3: Guarda este post

CARROSSEL 2 — Erros comuns
Slide 1: Publicar sem plano
Slide 2: Falar para toda a gente
Slide 3: Desistir à terceira semana

CARROSSEL 3 — O que ninguém te diz
Slide 1: O alcance não é tudo
Slide 2: A comunidade é
Slide 3: Comenta AQUI`,
  },
  {
    nome: 'B',
    porque: 'títulos só a negrito, sem a palavra carrossel',
    carrosseis: 3,
    texto: `
**Como começar hoje mesmo**
Slide 1: O primeiro passo é o mais difícil
Slide 2: Mas não tem de ser

**Os três erros que toda a gente faz**
Slide 1: Publicar sem plano
Slide 2: Falar para toda a gente

**O que ninguém te diz sobre o alcance**
Slide 1: O alcance não é tudo
Slide 2: A comunidade é`,
  },
  {
    nome: 'C',
    porque: 'sem títulos nenhuns — só a numeração a recomeçar',
    carrosseis: 3,
    texto: `
Slide 1: O primeiro passo é o mais difícil
Slide 2: Mas não tem de ser
Slide 1: Publicar sem plano
Slide 2: Falar para toda a gente
Slide 1: O alcance não é tudo
Slide 2: A comunidade é`,
  },
  {
    nome: 'D',
    porque: 'rótulos de secção a negrito não são carrosséis novos',
    carrosseis: 2,
    texto: `
## Carrossel 1: Como começar

**Gancho**
Slide 1: O primeiro passo é o mais difícil

**Desenvolvimento**
Slide 2: Mas não tem de ser
Slide 3: Há um caminho

**CTA**
Slide 4: Guarda este post

## Carrossel 2: Erros comuns

**Gancho**
Slide 1: Publicar sem plano

**Desenvolvimento**
Slide 2: Falar para toda a gente

**CTA**
Slide 3: Comenta AQUI`,
  },
  {
    nome: 'E',
    porque: 'linhas de --- a separar blocos sem marcas nenhumas',
    carrosseis: 3,
    slides: 9,
    texto: `
O primeiro passo é o mais difícil
Mas não tem de ser
Guarda este post

---

Publicar sem plano
Falar para toda a gente
Desistir à terceira semana

---

O alcance não é tudo
A comunidade é
Comenta AQUI`,
  },
  {
    nome: 'F',
    porque: 'títulos a negrito com listas numeradas por baixo',
    carrosseis: 2,
    slides: 6,
    texto: `
**Como começar**
1. O primeiro passo é o mais difícil
2. Mas não tem de ser
3. Guarda este post

**Erros comuns**
1. Publicar sem plano
2. Falar para toda a gente
3. Desistir à terceira semana`,
  },
  {
    nome: 'G',
    porque: 'o que sai de um PDF: títulos em maiúsculas e prosa',
    carrosseis: 3,
    slides: 9,
    texto: `
COMO COMEÇAR
O primeiro passo é o mais difícil
Mas não tem de ser
Guarda este post

ERROS COMUNS
Publicar sem plano
Falar para toda a gente
Desistir à terceira semana

O QUE NINGUÉM TE DIZ
O alcance não é tudo
A comunidade é
Comenta AQUI`,
  },
  {
    nome: 'H',
    porque: 'nove carrosséis com títulos em "1) Nome" — nove, não dez',
    carrosseis: 9,
    slides: 27,
    texto: Array.from(
      { length: 9 },
      (_, i) => `
${i + 1}) Tema número ${i + 1}
Slide 1: gancho do tema ${i + 1}
Slide 2: meio do tema ${i + 1}
Slide 3: fecho do tema ${i + 1}`,
    ).join('\n'),
  },
  {
    nome: 'I',
    porque: 'prosa pura: cada parágrafo vale por um slide',
    carrosseis: 1,
    slides: 4,
    texto: `
O primeiro passo é sempre o mais difícil, e não há volta a dar a isso.

Mas há uma maneira de o tornar mais pequeno: fazer só a primeira parte.

Depois disso, o resto vem quase sozinho, porque já começaste.

Guarda este post para quando precisares de te lembrares.`,
  },
  {
    nome: 'J',
    porque: '"Slide 1" sozinho, com o texto na linha a seguir',
    carrosseis: 2,
    slides: 4,
    texto: `
CARROSSEL 1 — Um
Slide 1
O primeiro passo é o mais difícil
Slide 2
Mas não tem de ser

CARROSSEL 2 — Dois
Slide 1
Publicar sem plano
Slide 2
Falar para toda a gente`,
  },
  {
    nome: 'K',
    porque: 'só pontos, sem títulos',
    carrosseis: 1,
    slides: 4,
    texto: `
- O primeiro passo é o mais difícil
- Mas não tem de ser
- Há um caminho mais curto
- Guarda este post`,
  },
  {
    nome: 'L',
    porque: 'nove carrosséis com CARROSSEL n: e pontos',
    carrosseis: 9,
    slides: 27,
    texto: Array.from(
      { length: 9 },
      (_, i) => `
CARROSSEL ${i + 1}: Tema ${i + 1}
- gancho ${i + 1}
- meio ${i + 1}
- fecho ${i + 1}`,
    ).join('\n'),
  },
  {
    nome: 'M',
    porque: 'um carrossel só, numerado de 1 a 6, com rótulos pelo meio',
    carrosseis: 1,
    slides: 6,
    texto: `
**O carrossel do mês**

**Gancho**
Slide 1: Ninguém te disse isto

**A parte que interessa**
Slide 2: O alcance não é tudo
Slide 3: A comunidade é
Slide 4: E constrói-se devagar

**A prova**
Slide 5: Olha para os números

**Chamada à ação**
Slide 6: Comenta AQUI`,
  },
  {
    nome: 'N',
    porque: 'títulos com um emoji à cabeça',
    carrosseis: 3,
    slides: 6,
    texto: `
🔥 CARROSSEL 1 – Como começar
- um
- dois

✨ CARROSSEL 2 – Erros comuns
- um
- dois

💡 CARROSSEL 3 – O resto
- um
- dois`,
  },
  {
    nome: 'O',
    porque: '"1. Título" com ponto, seguido de Slide 1',
    carrosseis: 3,
    slides: 6,
    texto: `
1. Como começar
Slide 1: um
Slide 2: dois

2. Erros comuns
Slide 1: um
Slide 2: dois

3. O resto
Slide 1: um
Slide 2: dois`,
  },
  {
    nome: 'P',
    porque: 'uma frase solta não é um carrossel',
    carrosseis: 0,
    texto: 'Faz um carrossel sobre produtividade.',
  },
  {
    nome: 'Q',
    porque: 'o cabeçalho do documento não conta como carrossel',
    carrosseis: 2,
    slides: 6,
    texto: `
GUIA DE CONTEÚDO 2026

COMO COMEÇAR
O primeiro passo é o mais difícil
Mas não tem de ser
Guarda este post

ERROS COMUNS
Publicar sem plano
Falar para toda a gente
Desistir à terceira semana`,
  },
  {
    nome: 'R',
    porque: 'cabeçalhos ## com pontos por baixo',
    carrosseis: 2,
    slides: 4,
    texto: `
## Como começar
- O primeiro passo é o mais difícil
- Mas não tem de ser

## Erros comuns
- Publicar sem plano
- Falar para toda a gente`,
  },
  {
    nome: 'S',
    porque: 'o --- separa mesmo quando a numeração não recomeça',
    carrosseis: 2,
    slides: 4,
    texto: `
Slide 1: um
Slide 2: dois

---

Slide 3: três
Slide 4: quatro`,
  },
  {
    nome: 'T',
    porque: '"Carrossel 1" sozinho numa linha, sem nome',
    carrosseis: 2,
    slides: 4,
    texto: `
Carrossel 1
Slide 1: um
Slide 2: dois

Carrossel 2
Slide 1: um
Slide 2: dois`,
  },
  {
    nome: 'U',
    porque: 'um parágrafo colado não se parte à força',
    carrosseis: 1,
    slides: 1,
    texto:
      'O primeiro passo é sempre o mais difícil, e não há volta a dar a isso. Mas há uma maneira de o tornar mais pequeno, que é fazer só a primeira parte e deixar o resto para depois.',
  },
  {
    nome: 'V',
    porque: 'o Word que perdeu as linhas em branco',
    carrosseis: 3,
    slides: 6,
    texto: `
COMO COMEÇAR
O primeiro passo é o mais difícil
Mas não tem de ser
ERROS COMUNS
Publicar sem plano
Falar para toda a gente
O QUE NINGUÉM TE DIZ
O alcance não é tudo
A comunidade é`,
  },
  {
    nome: 'Y',
    porque: 'o rótulo vem na linha da marca e o texto por baixo',
    carrosseis: 1,
    slides: 7,
    primeiro: 'Apaga a tua bio e experimenta esta estrutura.\nDemora 30 segundos a perceber.',
    texto: `
Slide 1 — Gancho
Apaga a tua bio e experimenta esta estrutura.
Demora 30 segundos a perceber.

Slide 2 — Passo 1
Diz QUEM ajudas.

“Ajudo mulheres profissionais com pouco tempo para criar conteúdo.”

A pessoa precisa de se reconhecer.

Slide 3 — Passo 2
Mostra EM QUÊ ajudas.

“A organizar ideias e a transformá-las em conteúdo para o Instagram.”

Troca frases vagas por uma ajuda concreta.

Slide 4 — Passo 3
Indica o PRÓXIMO PASSO.

“Envia-me MENTORIA para conheceres o acompanhamento.”

Escolhe uma ação fácil de perceber.

Slide 5 — Like + ponte
Já sabes o que escrever.
Deixa um ❤️ antes de veres por que esta ordem faz sentido.

Slide 6 — Conclusão
Quem chega ao perfil tem três perguntas:

“Isto é para mim?”
“Ajuda-me em quê?”
“Como começo?”

A tua bio deve responder às três.

Slide 7 — CTA
Abre a tua bio agora.
Qual destas peças está em falta: quem, ajuda ou próximo passo?`,
  },
  {
    nome: 'Z',
    porque: 'a marca traz mesmo o texto quando não há nada por baixo',
    carrosseis: 1,
    slides: 2,
    primeiro: 'O primeiro passo é o mais difícil, e não há volta a dar a isso.',
    texto: `
Slide 1: O primeiro passo é o mais difícil, e não há volta a dar a isso.
Slide 2: Mas há uma maneira de o tornar mais pequeno.`,
  },
  {
    nome: 'X',
    porque: 'a legenda por baixo dos slides não parte nada',
    carrosseis: 2,
    slides: 4,
    texto: `
CARROSSEL 1 — Um
Slide 1: um
Slide 2: dois
Legenda: escreve aqui a legenda do post

CARROSSEL 2 — Dois
Slide 1: um
Slide 2: dois
Legenda: outra legenda qualquer`,
  },
];

let maus = 0;
for (const caso of CASOS) {
  const lidos = extrairDoTexto(caso.texto.trim());
  const slides = lidos.reduce((a, c) => a + c.slides.length, 0);
  const primeiro = lidos[0]?.slides[0] ?? '';
  const certo =
    lidos.length === caso.carrosseis &&
    (caso.slides === undefined || slides === caso.slides) &&
    (caso.primeiro === undefined || primeiro === caso.primeiro);
  if (!certo) maus++;
  const esperado = `${caso.carrosseis}${caso.slides === undefined ? '' : `/${caso.slides}`}`;
  const deu = `${lidos.length}/${slides}`;
  console.log(
    `${certo ? ' ok ' : 'MAU '} ${caso.nome}  ${caso.porque}` +
      (certo
        ? ''
        : `\n      esperava ${esperado}, deu ${deu} → ${lidos.map((c) => `${c.titulo} (${c.slides.length})`).join(' | ')}` +
          (caso.primeiro !== undefined && primeiro !== caso.primeiro
            ? `\n      1.º slide esperado: ${JSON.stringify(caso.primeiro)}\n      1.º slide dado:     ${JSON.stringify(primeiro)}`
            : '')),
  );
}

console.log(
  maus
    ? `\n${maus} de ${CASOS.length} casos maus.`
    : `\nOs ${CASOS.length} casos passam.`,
);
process.exit(maus ? 1 : 0);
