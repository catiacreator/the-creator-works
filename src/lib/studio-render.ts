import { hexParaRgba, corDoTexto, type Estilo } from './studio-estilos';
import { lerTrechos, type Marcas } from './studio-texto';

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
 * Um pedaço de palavra com uma letra só sua.
 *
 * Uma palavra pode ter mais do que um: em `__Instagram__.` o nome vai
 * sublinhado e o ponto não — mas continuam colados, sem espaço pelo meio.
 * Por isso a palavra é a unidade que se separa das outras, e o segmento a
 * unidade que se desenha.
 */
interface Segmento extends Marcas {
  texto: string;
  largura: number;
}

interface Palavra {
  segmentos: Segmento[];
  largura: number;
}

/**
 * Uma linha já partida.
 * `ultima` marca a que fecha um parágrafo — essa nunca se justifica, senão
 * ficam três palavras esticadas de uma ponta à outra do slide.
 */
interface Linha {
  palavras: Palavra[];
  largura: number;
  ultima: boolean;
}

/** A letra de um segmento: a do estilo, com o que a marca lhe acrescentar. */
function letra(estilo: Estilo, px: number, m: Marcas) {
  const peso = m.negrito || estilo.negrito !== false ? 700 : 400;
  const inclinada = m.italico ? 'italic ' : '';
  return `${inclinada}${peso} ${px}px ${estilo.fonte}, Poppins, Arial, sans-serif`;
}

function partirEmLinhas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  estilo: Estilo,
  px: number,
  larguraMax: number,
): { linhas: Linha[]; espaco: number } {
  ctx.font = letra(estilo, px, {});
  const espaco = ctx.measureText(' ').width;

  // ── do texto marcado para parágrafos de palavras ──
  const paragrafos: Palavra[][] = [[]];
  let emCurso: Segmento[] = [];

  const fecharPalavra = () => {
    if (!emCurso.length) return;
    paragrafos[paragrafos.length - 1].push({
      segmentos: emCurso,
      largura: emCurso.reduce((a, seg) => a + seg.largura, 0),
    });
    emCurso = [];
  };

  for (const trecho of lerTrechos(texto)) {
    const { texto: t, ...marcas } = trecho;
    ctx.font = letra(estilo, px, marcas);
    for (const pedaco of t.split(/(\s+)/)) {
      if (!pedaco) continue;
      if (/^\s+$/.test(pedaco)) {
        fecharPalavra();
        // cada mudança de linha abre um parágrafo — duas seguidas deixam
        // uma linha em branco, como no campo onde se escreveu
        const quebras = pedaco.match(/\n/g)?.length ?? 0;
        for (let k = 0; k < quebras; k++) paragrafos.push([]);
        continue;
      }
      emCurso.push({ ...marcas, texto: pedaco, largura: ctx.measureText(pedaco).width });
    }
  }
  fecharPalavra();

  // ── e daí para linhas que caibam ──
  const linhas: Linha[] = [];
  for (const palavras of paragrafos) {
    if (!palavras.length) {
      linhas.push({ palavras: [], largura: 0, ultima: true });
      continue;
    }
    let atual: Palavra[] = [palavras[0]];
    let largura = palavras[0].largura;
    for (let i = 1; i < palavras.length; i++) {
      const tentativa = largura + espaco + palavras[i].largura;
      if (tentativa > larguraMax) {
        linhas.push({ palavras: atual, largura, ultima: false });
        atual = [palavras[i]];
        largura = palavras[i].largura;
      } else {
        atual.push(palavras[i]);
        largura = tentativa;
      }
    }
    linhas.push({ palavras: atual, largura, ultima: true });
  }
  return { linhas, espaco };
}

/**
 * Escreve uma linha, palavra a palavra, a partir de onde lhe mandam.
 *
 * O `intervalo` é o que vai entre palavras: o espaço normal, ou o espaço
 * esticado quando a linha é para justificar. Dentro de uma palavra os
 * segmentos ficam colados. O sublinhado é um risco por baixo — o canvas não
 * sabe fazê-lo sozinho.
 */
function escreverLinha(
  ctx: CanvasRenderingContext2D,
  linha: Linha,
  estilo: Estilo,
  px: number,
  x: number,
  y: number,
  intervalo: number,
) {
  let cursor = x;
  linha.palavras.forEach((p, i) => {
    for (const seg of p.segmentos) {
      ctx.font = letra(estilo, px, seg);
      ctx.fillText(seg.texto, cursor, y);
      if (seg.sublinhado) {
        ctx.fillRect(cursor, y + px * 0.16, seg.largura, Math.max(1, px * 0.055));
      }
      cursor += seg.largura;
    }
    if (i < linha.palavras.length - 1) cursor += intervalo;
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

  const larguraUtil = caixaL - padX * 2;
  const { linhas, espaco } = partirEmLinhas(
    ctx,
    (texto || '').trim(),
    estilo,
    px,
    larguraUtil,
  );
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

  // escreve-se sempre da esquerda para a direita, palavra a palavra: é o
  // alinhamento que decide onde cada linha começa, e a conta é feita aqui
  const alinhamento = estilo.alinhamento ?? 'esquerda';
  ctx.textAlign = 'left';

  linhas.forEach((l, i) => {
    if (!l.palavras.length) return;
    const y = comeco + i * alturaLinha;

    // uma linha do meio de um parágrafo justificado estica os intervalos;
    // já mais larga do que a caixa, ou de uma palavra só, fica como está
    const justificar =
      alinhamento === 'justificado' &&
      !l.ultima &&
      l.palavras.length > 1 &&
      l.largura < larguraUtil;
    const intervalo = justificar
      ? espaco + (larguraUtil - l.largura) / (l.palavras.length - 1)
      : espaco;
    const largura = justificar ? larguraUtil : l.largura;

    const x =
      alinhamento === 'centro'
        ? caixaX + (caixaL - largura) / 2
        : alinhamento === 'direita'
          ? caixaX + caixaL - padX - largura
          : caixaX + padX;

    escreverLinha(ctx, l, estilo, px, x, y, intervalo);
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
