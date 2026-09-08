/** Extração de texto de PDF, DOCX, XLSX, TXT e Markdown. Só corre no servidor. */

export type SourceKind = 'pdf' | 'docx' | 'xlsx' | 'txt' | 'drive' | 'text';

export function kindFromMime(mime: string, filename = ''): SourceKind {
  const lower = filename.toLowerCase();
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    return 'docx';
  }
  if (
    mime.includes('spreadsheet') ||
    mime === 'application/vnd.ms-excel' ||
    /\.(xlsx|xls|csv)$/.test(lower)
  ) {
    return 'xlsx';
  }
  return 'txt';
}

/**
 * O PDF, com o texto e as propriedades do ficheiro.
 * As propriedades interessam ao Documento Mestre: é lá que ele guarda o
 * briefing, sem sujar as páginas.
 */
export async function lerPdf(
  buffer: Buffer,
): Promise<{ text: string; info?: Record<string, unknown> }> {
  // import dinâmico: pdf-parse é CJS e lê o disco no import de topo
  const mod = await import('pdf-parse');
  const pdfParse = (
    mod as unknown as {
      default: (b: Buffer) => Promise<{ text: string; info?: Record<string, unknown> }>;
    }
  ).default;
  return pdfParse(buffer);
}

export async function extractText(buffer: Buffer, kind: SourceKind): Promise<string> {
  if (kind === 'pdf') {
    const data = await lerPdf(buffer);
    return clean(data.text);
  }

  if (kind === 'docx') {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return clean(value);
  }

  if (kind === 'xlsx') {
    const XLSX = await import('xlsx');
    const livro = XLSX.read(buffer, { type: 'buffer' });
    const partes: string[] = [];
    for (const nome of livro.SheetNames) {
      const folha = livro.Sheets[nome];
      const texto = XLSX.utils.sheet_to_csv(folha, { blankrows: false }).trim();
      if (texto) partes.push(`## ${nome}\n${texto}`);
    }
    return clean(partes.join('\n\n'));
  }

  return clean(buffer.toString('utf8'));
}

function clean(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Parte um texto longo em blocos temáticos aproximados, para gerar N carrosséis. */
export function splitIntoChunks(text: string, chunks: number): string[] {
  if (chunks <= 1) return [text];
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 40);
  if (paragraphs.length <= chunks) return paragraphs.length ? paragraphs : [text];

  const per = Math.ceil(paragraphs.length / chunks);
  const out: string[] = [];
  for (let i = 0; i < paragraphs.length; i += per) {
    out.push(paragraphs.slice(i, i + per).join('\n\n'));
  }
  return out.slice(0, chunks);
}
