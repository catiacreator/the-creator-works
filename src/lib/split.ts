import type { CarouselContent, TemplateSpec, TextBox } from './types';

/**
 * Divisor de texto — a alternativa à IA.
 * Pega no texto que a criadora carregou (PDF, DOCX, TXT ou colado) e reparte-o
 * pelos slides, respeitando as caixas do template e os limites de caracteres.
 * Não inventa nada: só corta, distribui e apara.
 */

function boxAppliesTo(box: TextBox, idx: number, total: number) {
  const scope = box.scope ?? 'all';
  if (scope === 'all') return true;
  if (scope === 'first') return idx === 0;
  if (scope === 'last') return idx === total - 1;
  return idx > 0 && idx < total - 1;
}

/** Corta em frases, sem partir abreviaturas óbvias nem números decimais. */
function toSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .split(/\n{2,}/)
    .flatMap((par) =>
      par
        .split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÀÇ"“«\d])/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .filter((s) => s.length > 1);
}

/** Apara no espaço mais próximo, sem cortar palavras a meio. */
function trimTo(text: string, max: number | undefined) {
  const limit = max ?? 220;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const space = cut.lastIndexOf(' ');
  return (space > limit * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:\-–—]$/, '') + '…';
}

/** Reparte as frases por N grupos com um peso de caracteres parecido. */
function balance(sentences: string[], groups: number): string[][] {
  if (groups <= 1) return [sentences];
  const total = sentences.reduce((n, s) => n + s.length, 0);
  const target = total / groups;
  const out: string[][] = [];
  let current: string[] = [];
  let size = 0;

  for (const s of sentences) {
    current.push(s);
    size += s.length;
    const restantes = groups - out.length - 1;
    const sobram = sentences.length - sentences.indexOf(s) - 1;
    if ((size >= target && out.length < groups - 1 && sobram >= restantes) || sobram === restantes) {
      out.push(current);
      current = [];
      size = 0;
    }
  }
  if (current.length) out.push(current);
  while (out.length < groups) out.push([]);
  return out.slice(0, groups);
}

export function splitIntoSlides(args: {
  text: string;
  spec: TemplateSpec;
  slidesPer: number;
  /** Título dado à mão; senão sai da primeira linha do texto. */
  title?: string | null;
}): CarouselContent {
  const { spec, slidesPer } = args;
  const raw = (args.text ?? '').trim();
  if (!raw) throw new Error('O texto está vazio — não há nada para repartir.');

  const sentences = toSentences(raw);
  if (!sentences.length) throw new Error('Não consegui encontrar frases neste texto.');

  // Que caixa é o título e qual é o corpo? A maior fonte manda.
  const ordered = [...spec.boxes].sort((a, b) => b.fontSize - a.fontSize);
  const titleBox = ordered[0];
  const bodyBox = ordered.find((b) => b.key !== titleBox?.key && (b.maxChars ?? 0) >= 80) ?? ordered[1];

  const grupos = balance(sentences, slidesPer);
  const slides = grupos.map((grupo, idx) => {
    const fields: Record<string, string> = {};
    const frases = grupo.length ? grupo : [''];
    const primeira = frases[0] ?? '';
    const resto = frases.slice(1).join(' ');

    for (const box of spec.boxes) {
      if (!boxAppliesTo(box, idx, slidesPer)) continue;
      if (titleBox && box.key === titleBox.key) {
        fields[box.key] = trimTo(primeira, box.maxChars);
      } else if (bodyBox && box.key === bodyBox.key) {
        fields[box.key] = trimTo(resto || (frases.length === 1 ? '' : primeira), box.maxChars);
      } else {
        // kicker, CTA e afins ficam vazios — são teus para escreveres.
        fields[box.key] = '';
      }
    }
    return { idx, fields };
  });

  const primeiraLinha = raw.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  const title = (args.title || trimTo(primeiraLinha, 80)).trim();

  // A legenda arranca com o texto original aparado: é ponto de partida para
  // editares, não uma legenda pronta.
  const caption = trimTo(raw.replace(/\n+/g, ' '), 1500);

  return {
    title,
    topic: title,
    caption,
    hashtags: '',
    slides,
  };
}
