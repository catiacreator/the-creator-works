import fs from 'node:fs/promises';
import path from 'node:path';

export interface LoadedFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600 | 700 | 800;
  style: 'normal' | 'italic';
}

let cache: LoadedFont[] | null = null;

/**
 * Carrega as fontes de /fonts.
 * Convenção do nome do ficheiro:  NomeDaFonte-700.ttf  ou  NomeDaFonte-700-italic.otf
 * Põe aqui as mesmas fontes do teu template do Canva para o render bater certo.
 * Se a pasta estiver vazia, descarrega a Inter como recurso de emergência.
 */
export async function loadFonts(extra: LoadedFont[] = []): Promise<LoadedFont[]> {
  if (cache) return [...cache, ...extra];

  const dir = path.join(process.cwd(), 'fonts');
  const fonts: LoadedFont[] = [];

  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (!/\.(ttf|otf|woff)$/i.test(file)) continue;
      const base = file.replace(/\.(ttf|otf|woff)$/i, '');
      const [name, weightRaw, styleRaw] = base.split('-');
      fonts.push({
        name: name || 'Custom',
        data: await fs.readFile(path.join(dir, file)),
        weight: (Number(weightRaw) || 400) as LoadedFont['weight'],
        style: styleRaw === 'italic' ? 'italic' : 'normal',
      });
    }
  } catch {
    /* pasta inexistente — segue para o fallback */
  }

  if (fonts.length === 0) {
    const urls: Array<[LoadedFont['weight'], string]> = [
      [400, 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff'],
      [700, 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff'],
    ];
    for (const [weight, url] of urls) {
      const res = await fetch(url);
      if (!res.ok) continue;
      fonts.push({
        name: 'Inter',
        data: Buffer.from(await res.arrayBuffer()),
        weight,
        style: 'normal',
      });
    }
  }

  cache = fonts;
  return [...fonts, ...extra];
}

/** Nomes disponíveis, para o editor de template oferecer escolha. */
export async function fontFamilies() {
  const fonts = await loadFonts();
  return Array.from(new Set(fonts.map((f) => f.name)));
}
