/**
 * A conferência das mensagens de migração em falta.
 *
 *     npm run verificar-migracoes
 *
 * Uma migração por correr não é uma avaria — é trabalho por fazer. Mas a
 * frase que o Supabase devolve não diz isso:
 *
 *     Could not find the function public.guardar_chave_admin in the schema cache
 *
 * Está certa e é inútil: não diz o que fazer, não diz onde, e está em inglês.
 * Quem a lê é a Cátia, no meio de outra coisa qualquer.
 *
 * Estes casos são os erros de verdade — copiados do feitio com que o
 * PostgREST e o Postgres os mandam — e o que se prova é que cada um sai de lá
 * com o nome do ficheiro que falta correr.
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
  readFileSync(join(aqui, '..', 'src', 'lib', 'migracoes.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
);
const destino = join(mkdtempSync(join(tmpdir(), 'migracoes-')), 'migracoes.mjs');
writeFileSync(destino, outputText);
const { migracaoEmFalta, erroDaBaseDeDados } = await import(pathToFileURL(destino).href);

const casos = [];
const caso = (nome, fn) => casos.push({ nome, fn });

/** diz o nome do ficheiro certo? */
const aponta = (erro, ficheiro) => {
  const r = migracaoEmFalta(erro);
  if (!r) return 'não reconheceu o erro';
  if (!r.includes(ficheiro)) return `apontou para outra coisa: ${r}`;
  if (/could not find|does not exist|schema cache/i.test(r.replace(/\(O que faltou.*/s, ''))) {
    return `deixou o inglês na frase: ${r}`;
  }
  return null;
};

// ── os erros a sério, como eles chegam ───────────────────────
caso('função em falta (PostgREST, o caso da porta de serviço)', () =>
  aponta(
    {
      code: 'PGRST202',
      message:
        'Could not find the function public.guardar_chave_admin(resumo, sal) in the schema cache',
    },
    '027_porta_admin.sql',
  ),
);

caso('função em falta, sem o public. à frente', () =>
  aponta({ message: 'Could not find the function guardar_chave_admin in the schema cache' }, '027_porta_admin.sql'),
);

caso('a porta do CarouselSnap por correr', () =>
  aponta(
    { message: 'Could not find the function public.gastar_passagem(bilhete, c, e) in the schema cache' },
    '024_carouselsnap.sql',
  ),
);

caso('a identidade por correr', () =>
  aponta({ message: 'Could not find the function public.ver_passagem(c, snap) in the schema cache' }, '026_identidade.sql'),
);

caso('a conta dos créditos por correr', () =>
  aponta({ message: 'Could not find the function public.marcar_consumo in the schema cache' }, '022_consumos.sql'),
);

caso('o Financeiro por correr', () =>
  aponta({ message: 'Could not find the function public.consumo_de_todos(meses) in the schema cache' }, '025_financeiro.sql'),
);

caso('tabela em falta (Postgres, 42P01)', () =>
  aponta({ code: '42P01', message: 'relation "public.passagens" does not exist' }, '024_carouselsnap.sql'),
);

caso('a tabela das chaves em falta', () =>
  aponta({ code: '42P01', message: 'relation "public.chaves_admin" does not exist' }, '027_porta_admin.sql'),
);

caso('um erro em texto simples também serve', () =>
  aponta('Could not find the function public.ver_chave_admin in the schema cache', '027_porta_admin.sql'),
);

// ── o que NÃO se deve inventar ───────────────────────────────
caso('um erro que não é migração nenhuma fica como está', () => {
  const r = migracaoEmFalta({ message: 'duplicate key value violates unique constraint' });
  return r === null ? null : `inventou uma explicação: ${r}`;
});

caso('uma falha de rede não vira migração', () => {
  const r = migracaoEmFalta({ message: 'fetch failed' });
  return r === null ? null : `inventou uma explicação: ${r}`;
});

caso('permissão negada não vira migração', () => {
  const r = migracaoEmFalta({ code: '42501', message: 'permission denied for table membros' });
  return r === null ? null : `inventou uma explicação: ${r}`;
});

caso('erro vazio não vira nada', () => (migracaoEmFalta(null) === null ? null : 'inventou'));

caso('uma peça que não existe em tabela nenhuma dá a frase geral, sem inventar ficheiro', () => {
  const r = migracaoEmFalta({ message: 'Could not find the function public.abracadabra in the schema cache' });
  if (!r) return 'não reconheceu';
  if (/\d{3}_/.test(r)) return `inventou um ficheiro: ${r}`;
  return null;
});

// ── o embrulho que se atira ──────────────────────────────────
caso('erroDaBaseDeDados devolve um Error com a instrução', () => {
  const e = erroDaBaseDeDados({ message: 'Could not find the function public.guardar_chave_admin in the schema cache' });
  if (!(e instanceof Error)) return 'não é um Error';
  return e.message.includes('027_porta_admin.sql') ? null : `sem o ficheiro: ${e.message}`;
});

caso('erroDaBaseDeDados não estraga um erro normal', () => {
  const e = erroDaBaseDeDados({ message: 'duplicate key value violates unique constraint' });
  return e.message === 'duplicate key value violates unique constraint'
    ? null
    : `mexeu no recado: ${e.message}`;
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
