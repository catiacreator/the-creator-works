'use client';

import { toPng } from 'html-to-image';
import JSZip from 'jszip';

/**
 * Levar os carrosséis do Snap para fora.
 *
 * Sem isto o Estúdio desenha e não serve: vê-se o carrossel no ecrã e não há
 * maneira de o pôr no Instagram. É o passo que fecha o caminho todo — tema,
 * texto, desenho, ficheiro.
 *
 * O Creator Works já tem um exportador seu, e este não lhe toca. Não é
 * teimosia: o dele está preso aos formatos dele — retrato, quadrado, story —
 * e o Snap desenha sempre quadrado, 1080 por 1080. Encostar um ao outro era
 * arrastar as escolhas de um para dentro do outro, que é exactamente o que
 * não se quer nesta mudança.
 *
 * A biblioteca por baixo é a mesma que já cá estava. O Snap usava
 * `html2canvas`; esta app usa `html-to-image`, e faz o mesmo trabalho melhor.
 * Não se trazem duas bibliotecas para desenhar o mesmo pixel.
 */

/** O quadrado do Instagram. É o que o Snap desenha, e não há escolha a dar. */
export const LADO = 1080;

/**
 * Um slide em PNG.
 *
 * O `pixelRatio` é o que faz a diferença entre uma imagem que se vê e uma
 * que se publica: o nó no ecrã tem trezentos e tal pixéis de largura, e sem
 * esta conta o ficheiro sairia desse tamanho — bonito no monitor, esfarelado
 * no telemóvel de quem o abre.
 */
export async function slideParaPng(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio: LADO / node.clientWidth,
    width: node.clientWidth,
    height: node.clientHeight,
    // sem isto, uma segunda exportação devolve a imagem da primeira
    cacheBust: true,
  });
  const r = await fetch(dataUrl);
  return r.blob();
}

/** Dar um ficheiro a quem carregou. */
export function descarregar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // libertar depois do clique: revogar já cortava o download a meio
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * O carrossel inteiro num zip.
 *
 * Os nomes levam o número com um zero à frente — `01.png`, `02.png` — porque
 * sem ele o computador ordena 1, 10, 11, 2. Quem abre o zip para publicar
 * quer a ordem do carrossel, não a ordem do alfabeto.
 *
 * Um a um e não todos ao mesmo tempo: vinte slides a desenhar em paralelo
 * enchem a memória do browser e o separador morre a meio, sem dizer porquê.
 */
export async function carrosselParaZip(
  nodes: HTMLElement[],
  aoAvancar?: (feitos: number, total: number) => void,
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < nodes.length; i++) {
    const png = await slideParaPng(nodes[i]);
    zip.file(`${String(i + 1).padStart(2, '0')}.png`, png);
    aoAvancar?.(i + 1, nodes.length);
  }

  return zip.generateAsync({ type: 'blob' });
}
