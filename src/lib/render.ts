import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { loadFonts } from './fonts';
import type { TemplateSpec, TextBox } from './types';

/**
 * Motor de render local.
 * Compõe cada slide a partir do TemplateSpec (fundo + caixas de texto)
 * e devolve um PNG. É isto que substitui o Canva quando não há Enterprise.
 */

type Node = { type: string; props: Record<string, unknown> };

const el = (type: string, props: Record<string, unknown> = {}): Node => ({ type, props });

function boxAppliesTo(box: TextBox, idx: number, total: number) {
  const scope = box.scope ?? 'all';
  if (scope === 'all') return true;
  if (scope === 'first') return idx === 0;
  if (scope === 'last') return idx === total - 1;
  return idx > 0 && idx < total - 1;
}

/** Encolhe a fonte até o texto caber na caixa. */
function fitFontSize(box: TextBox, text: string) {
  let size = box.fontSize;
  for (let i = 0; i < 24; i++) {
    const charsPerLine = Math.max(1, Math.floor(box.width / (size * 0.52)));
    const lines = text
      .split('\n')
      .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
    if (lines * size * box.lineHeight <= box.height || size <= 14) break;
    size -= 2;
  }
  return size;
}

export interface RenderSlideArgs {
  spec: TemplateSpec;
  fields: Record<string, string>;
  idx: number;
  total: number;
  /** data URI (ou URL absoluto) da fotografia deste carrossel */
  photoUri?: string | null;
  /** data URI de um grafismo fixo por cima da foto (moldura, logo) */
  frameUri?: string | null;
  /** fontes carregadas por ela, para lá das que vêm na app */
  fontesExtra?: Array<{ name: string; data: Buffer; weight: 400 | 500 | 600 | 700 | 800; style: 'normal' | 'italic' }>;
}

export function buildSlideTree(args: RenderSlideArgs): Node {
  const { spec, fields, idx, total, photoUri, frameUri } = args;
  const children: Node[] = [];

  // 1. fotografia
  if (photoUri && spec.photo.mode !== 'none') {
    const full = spec.photo.mode === 'full-bleed';
    const band = spec.photo.band ?? Math.round(spec.height * 0.55);
    children.push(
      el('img', {
        src: photoUri,
        style: {
          position: 'absolute',
          left: 0,
          top: spec.photo.mode === 'bottom' ? spec.height - band : 0,
          width: spec.width,
          height: full ? spec.height : band,
          objectFit: 'cover',
          opacity: spec.photo.opacity ?? 1,
        },
      }),
    );
  }

  // 2. véu
  if (spec.overlay?.color) {
    children.push(
      el('div', {
        style: {
          position: 'absolute',
          inset: 0,
          backgroundColor: spec.overlay.color,
          borderRadius: spec.overlay.radius ?? 0,
        },
      }),
    );
  }

  // 3. faixas de cor vindas das formas do editor
  for (const forma of spec.formas ?? []) {
    children.push(
      el('div', {
        style: {
          position: 'absolute',
          left: forma.x,
          top: forma.y,
          width: forma.width,
          height: forma.height,
          backgroundColor: forma.color,
          borderRadius: forma.radius ?? 0,
          opacity: forma.opacity ?? 1,
        },
      }),
    );
  }

  // 4. grafismo fixo do template
  if (frameUri) {
    children.push(
      el('img', {
        src: frameUri,
        style: {
          position: 'absolute',
          left: 0,
          top: 0,
          width: spec.width,
          height: spec.height,
          objectFit: 'cover',
        },
      }),
    );
  }

  // 5. caixas de texto
  for (const box of spec.boxes) {
    if (!boxAppliesTo(box, idx, total)) continue;
    const raw = (box.fixed ?? fields[box.key] ?? '').trim();
    if (!raw) continue;
    const text = box.uppercase ? raw.toUpperCase() : raw;
    const size = fitFontSize(box, text);

    const justify =
      box.valign === 'center' ? 'center' : box.valign === 'bottom' ? 'flex-end' : 'flex-start';
    const items =
      box.align === 'center' ? 'center' : box.align === 'right' ? 'flex-end' : 'flex-start';

    // o texto vai dentro de um bloco próprio, para a faixa lhe ficar colada
    const bloco = el('div', {
      style: {
        display: 'flex',
        textAlign: box.align,
        fontFamily: box.fontFamily,
        fontSize: size,
        fontWeight: box.weight,
        lineHeight: box.lineHeight,
        color: box.color,
        letterSpacing: box.letterSpacing ?? 0,
        whiteSpace: 'pre-wrap',
        ...(box.contorno?.espessura
          ? {
              WebkitTextStroke: `${box.contorno.espessura}px ${box.contorno.cor}`,
              paintOrder: 'stroke fill',
            }
          : {}),
        ...(box.sombra
          ? {
              textShadow: `${box.sombra.x}px ${box.sombra.y}px ${box.sombra.desfoque}px ${box.sombra.cor}`,
            }
          : {}),
        ...(box.backdrop
          ? {
              backgroundColor: box.backdrop.color,
              paddingTop: box.backdrop.padding ?? 24,
              paddingBottom: box.backdrop.padding ?? 24,
              paddingLeft: Math.round((box.backdrop.padding ?? 24) * 1.4),
              paddingRight: Math.round((box.backdrop.padding ?? 24) * 1.4),
              borderRadius: box.backdrop.radius ?? 0,
            }
          : {}),
      },
      children: text,
    });

    children.push(
      el('div', {
        style: {
          position: 'absolute',
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: justify,
          alignItems: items,
        },
        children: [bloco],
      }),
    );
  }

  // 6. paginação
  if (spec.pager?.show) {
    children.push(
      el('div', {
        style: {
          position: 'absolute',
          left: spec.pager.x,
          top: spec.pager.y,
          fontFamily: spec.boxes[0]?.fontFamily ?? 'Inter',
          fontSize: spec.pager.fontSize,
          color: spec.pager.color,
          display: 'flex',
        },
        children: `${idx + 1}/${total}`,
      }),
    );
  }

  return el('div', {
    style: {
      width: spec.width,
      height: spec.height,
      display: 'flex',
      position: 'relative',
      backgroundColor: spec.background,
      overflow: 'hidden',
    },
    children,
  });
}

export async function renderSlidePng(args: RenderSlideArgs): Promise<Buffer> {
  const fonts = await loadFonts(args.fontesExtra ?? []);
  const svg = await satori(buildSlideTree(args) as never, {
    width: args.spec.width,
    height: args.spec.height,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight,
      style: f.style,
    })),
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: args.spec.width },
    background: args.spec.background,
  });
  return Buffer.from(resvg.render().asPng());
}

/** Converte um Buffer numa data URI utilizável pelo satori. */
export function toDataUri(buffer: Buffer, mime = 'image/png') {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export { defaultSpec } from './default-spec';
