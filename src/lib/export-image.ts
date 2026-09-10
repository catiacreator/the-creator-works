'use client';

import { toPng } from 'html-to-image';
import { FORMATOS, type Formato } from './types';

export type Resolucao = 'hd' | 'fullhd' | '4k';

/**
 * Em que tamanho sai o PNG.
 *
 * A largura é o que manda — a altura vem do formato do slide. Full HD é o
 * tamanho nativo dos formatos (1080px), que é o que o Instagram mostra; 4K
 * serve para quem quer ampliar depois sem a imagem esfarelar, e HD para
 * mandar por mensagem sem pesar.
 */
export const RESOLUCOES: Record<Resolucao, { label: string; largura: number; nota: string }> = {
  hd: { label: 'HD', largura: 720, nota: 'leve, para partilhar' },
  fullhd: { label: 'Full HD', largura: 1080, nota: 'o tamanho do Instagram' },
  '4k': { label: '4K', largura: 2160, nota: 'o dobro, para ampliar' },
};

const CHAVE = 'editor-resolucao';

/** A escolha fica no browser: é uma preferência de quem exporta. */
export function resolucaoGuardada(): Resolucao {
  try {
    const v = window.localStorage.getItem(CHAVE);
    if (v && v in RESOLUCOES) return v as Resolucao;
  } catch {
    // browser sem armazenamento (janela privada): fica o valor de partida
  }
  return 'fullhd';
}

export function guardarResolucao(r: Resolucao) {
  try {
    window.localStorage.setItem(CHAVE, r);
  } catch {
    // não poder guardar a preferência não é motivo para falhar a exportação
  }
}

/**
 * Exporta o nó do canvas.
 * Sem resolução dada, sai no tamanho nativo do formato (1080px de largura).
 */
export async function exportarPng(
  nodeId: string,
  formato: Formato,
  resolucao?: Resolucao,
): Promise<Blob> {
  const node = document.getElementById(nodeId);
  if (!node) throw new Error('Canvas não encontrado');

  const { w } = FORMATOS[formato];
  const largura = resolucao ? RESOLUCOES[resolucao].largura : w;
  const pixelRatio = largura / node.clientWidth;

  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    width: node.clientWidth,
    height: node.clientHeight,
    skipFonts: false,
  });

  const r = await fetch(dataUrl);
  return r.blob();
}

export function descarregar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
