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

function partirEmLinhas(ctx: CanvasRenderingContext2D, texto: string, larguraMax: number) {
  const linhas: string[] = [];
  for (const paragrafo of String(texto).split('\n')) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    if (!palavras.length) {
      linhas.push('');
      continue;
    }
    let linha = palavras[0];
    for (let i = 1; i < palavras.length; i++) {
      const tentativa = `${linha} ${palavras[i]}`;
      if (ctx.measureText(tentativa).width > larguraMax) {
        linhas.push(linha);
        linha = palavras[i];
      } else {
        linha = tentativa;
      }
    }
    linhas.push(linha);
  }
  return linhas;
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

  ctx.font = `700 ${px}px ${estilo.fonte}, Poppins, Arial, sans-serif`;
  const linhas = partirEmLinhas(ctx, (texto || '').trim(), caixaL - padX * 2);
  const alturaLinha = px * 1.28;
  const caixaA = estilo.caixaFixa
    ? areaA * (estilo.caixaAltura / 100)
    : linhas.length * alturaLinha + padY * 2;

  const caixaX = areaX;
  const caixaY = estilo.caixaFixa
    ? areaY + Math.max(0, areaA - caixaA) * (estilo.caixaY / 100)
    : areaY + (areaA * estilo.caixaY) / 100 - (caixaA * estilo.caixaY) / 100;

  if (estilo.opacidadeCaixa > 0) {
    ctx.fillStyle = hexParaRgba(estilo.corCaixa, estilo.opacidadeCaixa);
    cantos(ctx, caixaX, caixaY, caixaL, caixaA, estilo.raio);
    ctx.fill();
  }

  ctx.fillStyle = corDoTexto(estilo);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const alturaTexto = linhas.length * alturaLinha;
  const comeco = caixaY + (caixaA - alturaTexto) / 2 + px * 0.82;
  linhas.forEach((l, i) => ctx.fillText(l, caixaX + padX, comeco + i * alturaLinha));

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
