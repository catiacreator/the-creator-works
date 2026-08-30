'use client';

import { toPng } from 'html-to-image';
import { FORMATOS, type Formato } from './types';

/** Exporta o nó do canvas em resolução real (1080px de largura). */
export async function exportarPng(nodeId: string, formato: Formato): Promise<Blob> {
  const node = document.getElementById(nodeId);
  if (!node) throw new Error('Canvas não encontrado');

  const { w, h } = FORMATOS[formato];
  const pixelRatio = w / node.clientWidth;

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
