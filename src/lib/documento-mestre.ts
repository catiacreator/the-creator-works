import { readFileSync } from 'fs';
import { gunzipSync, gzipSync } from 'zlib';
import path from 'path';
import PDFDocument from 'pdfkit';
import { SEPARADORES, type Briefing } from './briefing';

/**
 * O Documento Mestre: o briefing dela em papel, com as cores e as letras da
 * app. Serve para ler, imprimir, guardar — e para voltar a entrar: no fim
 * leva um bloco que a app sabe reler para preencher tudo outra vez.
 */

/** A marca que abre e fecha o bloco que a app relê. */
export const ABRE = '<<<THE-CREATOR-WORKS';
export const FECHA = 'THE-CREATOR-WORKS>>>';

const CORES = {
  ink: '#1A1A1A',
  muted: '#7A736E',
  rosa: '#EE4E8B',
  sand: '#E8E4DE',
  creme: '#F6F4F1',
};

function letra(nome: string) {
  try {
    return readFileSync(path.join(process.cwd(), 'fonts', nome));
  } catch {
    return null;
  }
}

export function documentoMestre(args: {
  briefing: Briefing;
  nome?: string | null;
  handle?: string | null;
}): Promise<Buffer> {
  const { briefing } = args;
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });

  // as letras da casa; se faltarem, o PDF sai na letra do sistema
  const advercase = letra('Advercase-700.ttf');
  const poppins = letra('Poppins-400.woff');
  const poppinsBold = letra('Poppins-700.woff');
  const TITULO = advercase ? 'titulo' : 'Helvetica-Bold';
  const CORPO = poppins ? 'corpo' : 'Helvetica';
  const CORPO_FORTE = poppinsBold ? 'corpo-forte' : 'Helvetica-Bold';
  try {
    if (advercase) doc.registerFont('titulo', advercase);
    if (poppins) doc.registerFont('corpo', poppins);
    if (poppinsBold) doc.registerFont('corpo-forte', poppinsBold);
  } catch {
    /* fontkit não abriu a letra — segue com a do sistema */
  }

  const pedacos: Buffer[] = [];
  doc.on('data', (d: Buffer) => pedacos.push(d));
  const pronto = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(pedacos)));
  });

  const largura = doc.page.width - 112;

  // ── capa ─────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 6).fill(CORES.rosa);

  try {
    const logo = path.join(process.cwd(), 'public', 'the-creator-works.png');
    doc.image(logo, 56, 70, { width: 150 });
  } catch {
    /* sem logótipo, a capa vive sem ele */
  }

  doc
    .font(TITULO)
    .fontSize(34)
    .fillColor(CORES.ink)
    .text('Documento Mestre', 56, 150, { width: largura });

  doc
    .font(CORPO)
    .fontSize(11)
    .fillColor(CORES.muted)
    .text(
      'O briefing que a Cát.IA lê antes de escrever seja o que for. ' +
        'Guarda-o, imprime-o, ou volta a carregá-lo na app para preencher tudo de uma vez.',
      56,
      196,
      { width: largura, lineGap: 3 },
    );

  const quem = [args.nome, args.handle ?? briefing.instagram].filter(Boolean).join(' · ');
  doc
    .font(CORPO_FORTE)
    .fontSize(11)
    .fillColor(CORES.ink)
    .text(quem || 'The Creator Works', 56, 250, { width: largura });

  doc
    .font(CORPO)
    .fontSize(9)
    .fillColor(CORES.muted)
    .text(
      new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }),
      56,
      268,
    );

  doc.moveTo(56, 296).lineTo(doc.page.width - 56, 296).strokeColor(CORES.sand).stroke();
  doc.y = 320;

  // ── os quatro pilares ────────────────────────────
  for (const sep of SEPARADORES) {
    const respondidas = sep.campos.filter((c) => (briefing[c.id] ?? '').trim());
    if (!respondidas.length) continue;

    if (doc.y > doc.page.height - 200) doc.addPage();

    doc
      .rect(56, doc.y, largura, 30)
      .fill(CORES.creme)
      .fillColor(CORES.rosa)
      .font(TITULO)
      .fontSize(12)
      .text(sep.titulo.toUpperCase(), 68, doc.y + 9, { characterSpacing: 1.2 });

    doc.y += 46;

    for (const campo of respondidas) {
      const resposta = briefing[campo.id].trim();
      const texto = resposta === '__nenhum__' ? '(não se aplica)' : resposta;

      const alturaP = doc.font(CORPO_FORTE).fontSize(10).heightOfString(campo.pergunta, {
        width: largura,
      });
      const alturaR = doc.font(CORPO).fontSize(10.5).heightOfString(texto, {
        width: largura,
        lineGap: 2,
      });
      if (doc.y + alturaP + alturaR + 30 > doc.page.height - 70) doc.addPage();

      doc
        .font(CORPO_FORTE)
        .fontSize(10)
        .fillColor(CORES.ink)
        .text(campo.pergunta, 56, doc.y, { width: largura });

      doc
        .font(CORPO)
        .fontSize(10.5)
        .fillColor(CORES.muted)
        .text(texto, 56, doc.y + 4, { width: largura, lineGap: 2 });

      doc.y += 18;
    }

    doc.y += 10;
  }

  // ── o bloco que a app relê ───────────────────────
  // Vai nas propriedades do ficheiro, não impresso. Antes ocupava seis
  // páginas de letra minúscula cor de areia — páginas que pareciam em branco
  // e não eram para ninguém ler.
  doc.info.Title = 'Documento Mestre — The Creator Works';
  doc.info.Author = quem || 'The Creator Works';
  doc.info.Keywords =
    ABRE + gzipSync(Buffer.from(JSON.stringify(briefing), 'utf8')).toString('base64') + FECHA;

  // ── rodapé com o número das páginas ──────────────
  const total = doc.bufferedPageRange().count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(i);
    // sem isto, escrever abaixo da margem faz o pdfkit abrir uma página nova
    // — e o documento ficava com tantas páginas em branco como rodapés
    doc.page.margins.bottom = 0;
    doc
      .font(CORPO)
      .fontSize(8)
      .fillColor(CORES.muted)
      .text(`The Creator Works · ${i + 1} de ${total}`, 56, doc.page.height - 45, {
        width: largura,
        align: 'center',
        lineBreak: false,
      });
  }

  doc.end();
  return pronto;
}

/**
 * O caminho de volta: encontra o briefing dentro do texto do documento.
 *
 * Vai em base64 de propósito. O PDF parte as linhas onde lhe apetece, e para
 * as voltar a juntar é preciso limpar os espaços todos — o que, em JSON à
 * vista, comia também os espaços de dentro das respostas ("Marketing com IA"
 * voltava "MarketingcomIA"). Em base64 não há espaços nenhuns para confundir.
 */
export function briefingDoTexto(texto: string): Briefing | null {
  const i = texto.indexOf(ABRE);
  const f = texto.indexOf(FECHA);
  if (i === -1 || f === -1 || f < i) return null;

  const cru = texto.slice(i + ABRE.length, f).replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes = Buffer.from(cru, 'base64');

  for (const tentativa of [() => gunzipSync(bytes).toString('utf8'), () => bytes.toString('utf8')]) {
    try {
      const lido = JSON.parse(tentativa()) as Briefing;
      if (lido && typeof lido === 'object') return lido;
    } catch {
      /* tenta a maneira seguinte */
    }
  }
  return null;
}
