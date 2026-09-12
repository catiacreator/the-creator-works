/**
 * Um carrossel escrito por extenso, para se levar daqui.
 *
 * O desenho dos carrosséis passou a fazer-se no CarouselSnap. O que esta app
 * continua a fazer — e faz bem — é escrevê-los: a Cát.IA dá os slides, o
 * gancho, o remate, a legenda. Falta só a ponte, e a ponte é texto.
 *
 * O feitio é o mesmo que a Fábrica de carrosséis sempre soube ler, e não por
 * acaso: "Slide 1:", uma linha por slide, os parágrafos como foram escritos.
 * Quem colar isto do outro lado — ou aqui — não tem de arrumar nada.
 *
 * Os campos de um slide não têm nomes fixos: cada template inventa os seus
 * ("titulo", "texto", "gancho"…). Por isso não se escrevem os nomes, só os
 * valores, pela ordem em que lá estão. O que interessa é o que se lê.
 */

export interface SlideParaTexto {
  idx?: number;
  fields: Record<string, string>;
}

export interface CarrosselParaTexto {
  title?: string | null;
  topic?: string | null;
  caption?: string | null;
  hashtags?: string | null;
}

/** O texto de um slide: os valores dos campos, sem os nomes, sem os vazios. */
function corpo(fields: Record<string, string>): string {
  return Object.values(fields ?? {})
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join('\n');
}

/** O carrossel inteiro, pronto a copiar. */
export function textoDoCarrossel(
  carrossel: CarrosselParaTexto,
  slides: SlideParaTexto[],
): string {
  const partes: string[] = [];

  const titulo = (carrossel.title ?? carrossel.topic ?? '').trim();
  if (titulo) partes.push(titulo, '');

  const ordenados = [...slides].sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));
  ordenados.forEach((s, i) => {
    const texto = corpo(s.fields);
    if (!texto) return;
    partes.push(`Slide ${i + 1}: ${texto}`, '');
  });

  const legenda = (carrossel.caption ?? '').trim();
  if (legenda) partes.push('Legenda:', legenda, '');

  const tags = (carrossel.hashtags ?? '').trim();
  if (tags) partes.push(tags);

  return partes.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Um nome de ficheiro que se possa guardar em qualquer sistema. */
export function nomeDeFicheiro(titulo?: string | null): string {
  const limpo = (titulo ?? 'carrossel')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return `${limpo || 'carrossel'}.txt`;
}
