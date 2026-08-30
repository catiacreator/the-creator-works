import { FORMATOS } from './types';
import type {
  Elemento,
  ElementoForma,
  ElementoTexto,
  Formato,
  Slide,
  TemplateSpec,
  TextBox,
} from './types';

/**
 * A ponte que faltava: um desenho do editor → um TemplateSpec que o motor do
 * servidor sabe compor. É isto que permite desenhares o template à mão uma vez
 * e a fábrica reproduzi-lo em série.
 *
 * O primeiro slide do desenho é o molde. Se o desenho tiver mais slides, os
 * elementos que só existem no último passam a aparecer só no último.
 */

export interface DesignEditor {
  kind: 'editor';
  formato: Formato;
  slides: Slide[];
}

export function ehDesignDoEditor(spec: unknown): spec is DesignEditor {
  return (spec as { kind?: string })?.kind === 'editor';
}

const ehTexto = (e: Elemento): e is ElementoTexto => e.tipo === 'texto' || e.tipo === 'balao';
const ehForma = (e: Elemento): e is ElementoForma => e.tipo === 'forma';

/** Quantos caracteres cabem nesta caixa, com esta letra. */
function cabem(largura: number, altura: number, tamanho: number, entrelinha: number) {
  const porLinha = Math.max(1, Math.floor(largura / (tamanho * 0.52)));
  const linhas = Math.max(1, Math.floor(altura / (tamanho * entrelinha)));
  return Math.max(20, porLinha * linhas);
}

function paraCaixa(
  el: ElementoTexto,
  w: number,
  h: number,
  escopo: TextBox['scope'],
  indice: number,
): TextBox {
  const largura = (el.w / 100) * w;
  const altura = (el.h / 100) * h;
  const tamanho = Math.round((el.tamanho * w) / 1080);
  const entrelinha = 1.2;

  return {
    key: el.campo || `fixo${indice}`,
    label: el.campo || 'Texto fixo',
    x: Math.round((el.x / 100) * w),
    y: Math.round((el.y / 100) * h),
    width: Math.round(largura),
    height: Math.round(altura),
    fontFamily: el.fonte || 'Poppins',
    fontSize: tamanho,
    lineHeight: entrelinha,
    color: el.cor,
    align: el.alinhamento,
    weight: el.peso === 800 ? 700 : el.peso,
    letterSpacing: 0,
    maxChars: cabem(largura, altura, tamanho, entrelinha),
    scope: escopo,
    valign: 'center',
    ...(el.fundo && el.fundo !== 'transparent'
      ? { backdrop: { color: el.fundo, padding: Math.round(tamanho * 0.35), radius: el.raio } }
      : {}),
    ...(el.contorno ? { contorno: el.contorno } : {}),
    ...(el.sombra ? { sombra: el.sombra } : {}),
    // sem campo, o texto é sempre o mesmo — a @, uma assinatura
    ...(el.campo ? {} : { fixed: el.texto }),
  };
}

export function designParaSpec(design: DesignEditor): TemplateSpec {
  const { w, h } = FORMATOS[design.formato] ?? FORMATOS['3:4'];
  const molde = design.slides[0];
  const ultimo = design.slides.length > 1 ? design.slides[design.slides.length - 1] : null;

  if (!molde) {
    throw new Error('O template do editor não tem slides.');
  }

  const ordenados = [...molde.elementos].sort((a, b) => a.z - b.z);
  const boxes: TextBox[] = ordenados
    .filter(ehTexto)
    .map((el, i) => paraCaixa(el, w, h, 'all', i));

  // elementos que só existem no último slide (um CTA, por exemplo)
  if (ultimo) {
    const chavesDoMolde = new Set(ordenados.filter(ehTexto).map((e) => e.campo || e.texto));
    const soNoFim = [...ultimo.elementos]
      .sort((a, b) => a.z - b.z)
      .filter(ehTexto)
      .filter((e) => !chavesDoMolde.has(e.campo || e.texto));
    boxes.push(...soNoFim.map((el, i) => paraCaixa(el, w, h, 'last', boxes.length + i)));
  }

  // as formas entram como faixas por baixo do texto
  const formas = ordenados.filter(ehForma).map((el) => ({
    x: Math.round((el.x / 100) * w),
    y: Math.round((el.y / 100) * h),
    width: Math.round((el.w / 100) * w),
    height: Math.round((el.h / 100) * h),
    color: el.cor,
    radius: el.raio,
    opacity: el.opacidade,
  }));

  return {
    width: w,
    height: h,
    background: molde.fundoCor,
    photo: { mode: 'full-bleed', opacity: 1 },
    ...(molde.fundoEscurecer > 0
      ? { overlay: { color: `rgba(0,0,0,${molde.fundoEscurecer / 100})` } }
      : {}),
    pager: { show: false, x: w - 180, y: h - 120, color: 'rgba(255,255,255,0.7)', fontSize: 28 },
    boxes,
    ...(formas.length ? { formas } : {}),
  };
}
