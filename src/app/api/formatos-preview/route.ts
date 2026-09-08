import { readdir } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Que formatos já têm imagem de exemplo.
 *
 * Basta largar um ficheiro em `public/formatos/` com o nome
 * `{tipo}-{id}.jpg` (ou .png/.webp/.gif) — por exemplo
 * `reels-talking-head.jpg` — que ele passa a aparecer no card do formato,
 * em vez do esquema desenhado.
 */
export async function GET() {
  try {
    const pasta = path.join(process.cwd(), 'public', 'formatos');
    const ficheiros = await readdir(pasta);
    const imagens: Record<string, string> = {};
    for (const f of ficheiros) {
      const m = f.match(/^(.+)\.(jpg|jpeg|png|webp|gif)$/i);
      if (m) imagens[m[1]] = `/formatos/${f}`;
    }
    return NextResponse.json({ imagens });
  } catch {
    return NextResponse.json({ imagens: {} });
  }
}
