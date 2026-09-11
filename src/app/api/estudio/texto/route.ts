import { ok, withUser } from '@/lib/api';
import { extractText, kindFromMime } from '@/lib/extract';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * O texto que está dentro de um ficheiro.
 *
 * A Fábrica trabalha com texto colado. Um PDF ou um Word não se conseguem
 * ler no browser — o texto está lá dentro, encaixotado. Este é o único
 * momento da Fábrica que precisa de servidor: entra o ficheiro, sai o texto,
 * e o resto continua a acontecer na máquina de quem está a trabalhar.
 *
 * Não guarda nada. O ficheiro não chega a existir em disco nenhum: é lido da
 * memória, o texto é devolvido, e acabou. Quem quiser guardar o documento
 * tem os Materiais para isso — isto aqui é de passagem.
 *
 * Também não gasta IA. Extrair texto é extrair texto.
 */

/** O que se aceita, e o que se diz quando não é nada disto. */
const ACEITES = /\.(pdf|docx|txt|md|markdown)$/i;

/** 20 MB. Acima disto é quase sempre um PDF cheio de imagens, sem texto. */
const TAMANHO_MAXIMO = 20 * 1024 * 1024;

export const POST = withUser(async ({ request }) => {
  const tipo = request.headers.get('content-type') ?? '';
  if (!tipo.includes('multipart/form-data')) {
    throw new Error('Manda o ficheiro, não texto.');
  }

  const form = await request.formData();
  const ficheiro = form.get('file');
  if (!(ficheiro instanceof File) || ficheiro.size === 0) {
    throw new Error('Não recebi nenhum ficheiro.');
  }

  if (!ACEITES.test(ficheiro.name)) {
    throw new Error('Só sei ler PDF, Word (.docx), texto e markdown.');
  }

  if (ficheiro.size > TAMANHO_MAXIMO) {
    throw new Error('Esse ficheiro é grande de mais — o limite são 20 MB.');
  }

  const buffer = Buffer.from(await ficheiro.arrayBuffer());

  // um ficheiro estragado dá erros como "bad XRef entry", que não dizem nada
  // a quem só quer o texto lá de dentro
  let texto: string;
  try {
    texto = await extractText(buffer, kindFromMime(ficheiro.type, ficheiro.name));
  } catch {
    throw new Error(
      'Não consegui abrir esse ficheiro — pode estar estragado ou protegido por palavra-passe. Tenta gravá-lo outra vez, ou copia o texto e cola-o aqui.',
    );
  }

  if (!texto.trim()) {
    throw new Error(
      'Não consegui ler texto nenhum desse ficheiro. Se for um PDF digitalizado, o texto é uma fotografia — copia-o à mão.',
    );
  }

  return ok({ texto, nome: ficheiro.name });
});
