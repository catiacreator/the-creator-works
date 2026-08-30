import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';
import type { TemplateSpec, TextBox } from './types';

/**
 * Exporta o carrossel em PowerPoint.
 * Serve para o levar **editável** para o Canva: ao importar um .pptx, o Canva
 * mantém cada bloco de texto como texto, e não como imagem. Mudas palavras,
 * arrastas caixas, trocas a fonte — tudo lá dentro.
 *
 * Medidas: o Canva/PowerPoint trabalham em polegadas. A 96 pontos por polegada,
 * 1080×1440 px dá 11,25×15 pol. Os tamanhos de letra vão em pontos (px × 0,75).
 */

const DPI = 96;
const px = (v: number) => v / DPI;
const pt = (v: number) => Math.round(v * 0.75);

function boxAppliesTo(box: TextBox, idx: number, total: number) {
  const scope = box.scope ?? 'all';
  if (scope === 'all') return true;
  if (scope === 'first') return idx === 0;
  if (scope === 'last') return idx === total - 1;
  return idx > 0 && idx < total - 1;
}

/** '#RRGGBB' ou 'rgba(...)' → { cor, transparência } no formato do pptx. */
function toColor(css: string): { color: string; alpha: number } {
  const hex = css.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) return { color: hex[1].toUpperCase(), alpha: 0 };

  const rgba = css.trim().match(/rgba?\(([^)]+)\)/i);
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map((n) => n.trim());
    const to2 = (n: string) => Number(n).toString(16).padStart(2, '0').toUpperCase();
    return { color: `${to2(r)}${to2(g)}${to2(b)}`, alpha: Math.round((1 - Number(a)) * 100) };
  }
  return { color: 'FFFFFF', alpha: 0 };
}

export interface PptxSlide {
  fields: Record<string, string>;
}

/**
 * A mesma fotografia entra em todos os slides. Convertida uma vez para JPEG
 * do tamanho certo, senão o ficheiro fica com dezenas de megabytes.
 */
async function prepararFoto(buffer: Buffer, w: number, h: number) {
  const jpeg = await sharp(buffer)
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

export async function carouselToPptx(args: {
  spec: TemplateSpec;
  slides: PptxSlide[];
  title: string;
  /** fotografia de fundo, igual em todos os slides */
  photo?: Buffer | null;
}): Promise<Buffer> {
  const { spec, slides, title } = args;
  const pptx = new PptxGenJS();

  const foto = args.photo ? await prepararFoto(args.photo, spec.width, spec.height) : null;

  pptx.defineLayout({ name: 'CARROSSEL', width: px(spec.width), height: px(spec.height) });
  pptx.layout = 'CARROSSEL';
  pptx.title = title;

  const fundo = toColor(spec.background);

  for (let idx = 0; idx < slides.length; idx++) {
    const slide = pptx.addSlide();
    slide.background = { color: fundo.color };

    // 1. fotografia a cobrir o slide
    if (foto) {
      slide.addImage({
        data: foto,
        x: 0,
        y: 0,
        w: px(spec.width),
        h: px(spec.height),
        sizing: { type: 'cover', w: px(spec.width), h: px(spec.height) },
      });
    }

    // 2. véu sobre tudo, se o template o tiver
    if (spec.overlay?.color) {
      const veu = toColor(spec.overlay.color);
      slide.addShape('rect', {
        x: 0,
        y: 0,
        w: px(spec.width),
        h: px(spec.height),
        fill: { color: veu.color, transparency: veu.alpha },
        line: { type: 'none' },
      });
    }

    // 3. caixas de texto — cada uma continua a ser texto no Canva
    for (const box of spec.boxes) {
      if (!boxAppliesTo(box, idx, slides.length)) continue;
      const raw = (box.fixed ?? slides[idx].fields[box.key] ?? '').trim();
      if (!raw) continue;
      const texto = box.uppercase ? raw.toUpperCase() : raw;

      const cor = toColor(box.color);
      const faixa = box.backdrop ? toColor(box.backdrop.color) : null;

      slide.addText(texto, {
        x: px(box.x),
        y: px(box.y),
        w: px(box.width),
        h: px(box.height),
        fontFace: box.fontFamily,
        fontSize: pt(box.fontSize),
        bold: box.weight >= 600,
        color: cor.color,
        align: box.align,
        valign: box.valign === 'center' ? 'middle' : box.valign === 'bottom' ? 'bottom' : 'top',
        charSpacing: box.letterSpacing ? pt(box.letterSpacing) : undefined,
        lineSpacingMultiple: box.lineHeight,
        ...(faixa
          ? { fill: { color: faixa.color, transparency: faixa.alpha }, margin: 10 }
          : {}),
        shrinkText: true,
        wrap: true,
      });
    }

    // 4. paginação
    if (spec.pager?.show) {
      const cor = toColor(spec.pager.color);
      slide.addText(`${idx + 1}/${slides.length}`, {
        x: px(spec.pager.x),
        y: px(spec.pager.y),
        w: px(140),
        h: px(60),
        fontSize: pt(spec.pager.fontSize),
        color: cor.color,
        align: 'right',
      });
    }
  }

  const data = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  return data;
}
