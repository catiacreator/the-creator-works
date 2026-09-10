import { hexParaRgba, corDoTexto, type Estilo } from './studio-estilos';

/**
 * Desenha um slide num canvas — é o mesmo desenho que se vê no ecrã e o que
 * sai no ficheiro. O formato é sempre 3:4, 1080×1440.
 */

export const LARGURA = 1080;
export const ALTURA = 1440;
/** margem segura, igual à da pré-visualização */
export const MARGEM = 0.06;

function cantos(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Uma linha de texto já partida.
 * `ultima` marca a que fecha um parágrafo — essa nunca se justifica, senão
 * ficam três palavras esticadas de uma ponta à outra do slide.
 */
interface Linha {
  texto: string;
  ultima: boolean;
}

function partirEmLinhas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMax: number,
): Linha[] {
  const linhas: Linha[] = [];
  for (const paragrafo of String(texto).split('\n')) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    if (!palavras.length) {
      linhas.push({ texto: '', ultima: true });
      continue;
    }
    let linha = palavras[0];
    for (let i = 1; i < palavras.length; i++) {
      const tentativa = `${linha} ${palavras[i]}`;
      if (ctx.measureText(tentativa).width > larguraMax) {
        linhas.push({ texto: linha, ultima: false });
        linha = palavras[i];
      } else {
        linha = tentativa;
      }
    }
    linhas.push({ texto: linha, ultima: true });
  }
  return linhas;
}

/**
 * Escreve uma linha com as palavras esticadas até encher a largura.
 *
 * O canvas não sabe justificar: escreve-se palavra a palavra e reparte-se o
 * espaço que sobra pelos intervalos. Uma linha de uma palavra só fica como
 * está — não há intervalos onde pôr o espaço.
 */
function escreverJustificado(
  ctx: CanvasRenderingContext2D,
  linha: string,
  x: number,
  y: number,
  largura: number,
) {
  const palavras = linha.split(/\s+/).filter(Boolean);
  if (palavras.length < 2) {
    ctx.fillText(linha, x, y);
    return;
  }
  const soPalavras = palavras.reduce((a, p) => a + ctx.measureText(p).width, 0);
  const intervalo = (largura - soPalavras) / (palavras.length - 1);
  // linha já mais larga do que a caixa: escreve-se normal, sem encolher
  if (intervalo <= 0) {
    ctx.fillText(linha, x, y);
    return;
  }
  let cursor = x;
  palavras.forEach((p, i) => {
    ctx.fillText(p, cursor, y);
    cursor += ctx.measureText(p).width + (i < palavras.length - 1 ? intervalo : 0);
  });
}

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export interface OpcoesDoSlide {
  texto: string;
  estilo: Estilo;
  foto?: string | null;
  handle?: string;
  /** 1 = 1080×1440; 3 ≈ 4K */
  escala?: number;
}

export async function desenharSlide(canvas: HTMLCanvasElement, opcoes: OpcoesDoSlide) {
  const { texto, estilo, foto, handle } = opcoes;
  const escala = opcoes.escala || 1;

  canvas.width = LARGURA * escala;
  canvas.height = ALTURA * escala;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(escala, 0, 0, escala, 0, 0);

  ctx.fillStyle = estilo.corFundo || '#141010';
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  if (foto) {
    const img = await carregarImagem(foto);
    if (img) {
      // preenche sem deformar
      const sc = Math.max(LARGURA / img.naturalWidth, ALTURA / img.naturalHeight);
      const w = img.naturalWidth * sc;
      const h = img.naturalHeight * sc;
      ctx.drawImage(img, (LARGURA - w) / 2, (ALTURA - h) / 2, w, h);
    }
  }

  const areaX = LARGURA * MARGEM;
  const areaY = ALTURA * MARGEM;
  const areaL = LARGURA * (1 - MARGEM * 2);
  const areaA = ALTURA * (1 - MARGEM * 2);

  const px = estilo.tamanho * (LARGURA / 400);
  const padX = 30;
  const padY = 26;
  const caixaL = estilo.caixaFixa ? areaL * (estilo.caixaLargura / 100) : areaL;

  const peso = estilo.negrito === false ? 400 : 700;
  ctx.font = `${peso} ${px}px ${estilo.fonte}, Poppins, Arial, sans-serif`;
  const linhas = partirEmLinhas(ctx, (texto || '').trim(), caixaL - padX * 2);
  const alturaLinha = px * 1.28;
  const caixaA = estilo.caixaFixa
    ? areaA * (estilo.caixaAltura / 100)
    : linhas.length * alturaLinha + padY * 2;

  const caixaX = areaX;
  const caixaY = estilo.caixaCentrada
    ? areaY + (areaA - caixaA) / 2
    : estilo.caixaFixa
      ? areaY + Math.max(0, areaA - caixaA) * (estilo.caixaY / 100)
      : areaY + (areaA * estilo.caixaY) / 100 - (caixaA * estilo.caixaY) / 100;

  if (estilo.opacidadeCaixa > 0) {
    ctx.fillStyle = hexParaRgba(estilo.corCaixa, estilo.opacidadeCaixa);
    cantos(ctx, caixaX, caixaY, caixaL, caixaA, estilo.raio);
    ctx.fill();
  }

  ctx.fillStyle = corDoTexto(estilo);
  ctx.textBaseline = 'alphabetic';
  const alturaTexto = linhas.length * alturaLinha;
  const comeco = caixaY + (caixaA - alturaTexto) / 2 + px * 0.82;

  // onde começa a linha depende do alinhamento; o canvas faz o resto —
  // menos no justificado, que é escrito palavra a palavra aqui em baixo
  const alinhamento = estilo.alinhamento ?? 'esquerda';
  ctx.textAlign =
    alinhamento === 'centro' ? 'center' : alinhamento === 'direita' ? 'right' : 'left';
  const xDoTexto =
    alinhamento === 'centro'
      ? caixaX + caixaL / 2
      : alinhamento === 'direita'
        ? caixaX + caixaL - padX
        : caixaX + padX;

  const larguraUtil = caixaL - padX * 2;
  linhas.forEach((l, i) => {
    const y = comeco + i * alturaLinha;
    if (alinhamento === 'justificado' && !l.ultima) {
      escreverJustificado(ctx, l.texto, caixaX + padX, y, larguraUtil);
    } else {
      ctx.fillText(l.texto, xDoTexto, y);
    }
  });

  if (handle) {
    ctx.font = `600 ${LARGURA * 0.024}px Poppins, Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.textAlign = 'center';
    ctx.fillText(handle, LARGURA / 2, ALTURA - ALTURA * 0.035);
  }
}

export async function slideParaBlob(opcoes: OpcoesDoSlide): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  await desenharSlide(canvas, opcoes);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export async function slideParaDataUrl(opcoes: OpcoesDoSlide): Promise<string> {
  const canvas = document.createElement('canvas');
  await desenharSlide(canvas, opcoes);
  return canvas.toDataURL('image/png');
}

export function descarregar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
