import type {
  Elemento,
  ElementoTexto,
  Formato,
  Slide,
  SlideRow,
  TemplateSpec,
  TextBox,
} from './types';

/**
 * Converte um carrossel da fábrica num desenho do editor.
 * É a ponte que deixa abrir no editor visual um carrossel que foi composto
 * no servidor: cada caixa do template vira um elemento de texto, já ligado
 * ao campo que a fábrica preenche.
 */

function formatoDe(width: number, height: number): Formato {
  const r = width / height;
  const opcoes: Array<[Formato, number]> = [
    ['3:4', 0.75],
    ['4:5', 0.8],
    ['1:1', 1],
    ['9:16', 0.5625],
  ];
  return opcoes.reduce((melhor, [f, valor]) =>
    Math.abs(valor - r) < Math.abs(opcoes.find(([g]) => g === melhor)![1] - r) ? f : melhor,
  '3:4' as Formato);
}

function aplicaA(box: TextBox, idx: number, total: number) {
  const scope = box.scope ?? 'all';
  if (scope === 'all') return true;
  if (scope === 'first') return idx === 0;
  if (scope === 'last') return idx === total - 1;
  return idx > 0 && idx < total - 1;
}

function peso(w: number): ElementoTexto['peso'] {
  if (w >= 700) return 800;
  if (w >= 500) return 600;
  return 400;
}

/** Alpha do véu (`rgba(...)`) em 0-100. */
function escurecer(cor?: string) {
  if (!cor) return 0;
  const m = cor.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/);
  return m ? Math.round(Number(m[1]) * 100) : 0;
}

export function specParaDesign(args: {
  spec: TemplateSpec;
  slides: Array<Pick<SlideRow, 'idx' | 'fields'>>;
  fotoUrl?: string | null;
  fotoId?: string | null;
}): { kind: 'editor'; formato: Formato; slides: Slide[] } {
  const { spec, fotoUrl, fotoId } = args;
  const total = Math.max(1, args.slides.length);

  const slides: Slide[] = args.slides.map((linha, idx) => {
    const elementos: Elemento[] = [];
    let z = 1;

    for (const box of spec.boxes) {
      if (!aplicaA(box, idx, total)) continue;
      const bruto = (box.fixed ?? (linha.fields as Record<string, string>)?.[box.key] ?? '').trim();
      if (!bruto && !box.fixed) continue;

      elementos.push({
        id: `${linha.idx}-${box.key}`,
        tipo: 'texto',
        // percentagens: o editor escala em qualquer formato
        x: (box.x / spec.width) * 100,
        y: (box.y / spec.height) * 100,
        w: (box.width / spec.width) * 100,
        h: (box.height / spec.height) * 100,
        rot: 0,
        z: z++,
        texto: box.uppercase ? bruto.toUpperCase() : bruto,
        cor: box.color,
        fundo: box.backdrop?.color ?? 'transparent',
        tamanho: box.fontSize,
        peso: peso(box.weight),
        alinhamento: box.align,
        fonte: box.fontFamily,
        ...(box.contorno ? { contorno: box.contorno } : {}),
        ...(box.sombra ? { sombra: box.sombra } : {}),
        raio: box.backdrop?.radius ?? 0,
        campo: box.fixed ? null : box.key,
      } as ElementoTexto);
    }

    return {
      id: `slide-${linha.idx}`,
      fundoCor: spec.background,
      fundoUrl: fotoUrl ?? undefined,
      fundoFotoId: fotoId ?? null,
      fundoEscurecer: escurecer(spec.overlay?.color),
      elementos,
    };
  });

  return {
    kind: 'editor',
    formato: formatoDe(spec.width, spec.height),
    slides: slides.length ? slides : [],
  };
}
