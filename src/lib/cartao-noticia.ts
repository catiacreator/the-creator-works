import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { loadFonts } from './fonts';

/**
 * O cartão de notícia.
 *
 * Em vez de ir buscar uma fotografia de banco que não tem nada a ver com o
 * assunto, a app desenha a manchete. Sai sempre a propósito, sai na paleta
 * dela, e não usa uma imagem que não é sua.
 */

const LARGURA = 1080;
const ALTURA = 1440;

const INK = '#141010';
const ROSA = '#EE4E8B';
const CREME = '#F6F4F1';

const el = (type: string, props: Record<string, unknown>) => ({ type, props });

export async function cartaoDeNoticia(args: {
  titulo: string;
  fonte?: string | null;
  data?: string | null;
  handle?: string;
}): Promise<Buffer> {
  const fonts = await loadFonts();
  const titulo = args.titulo.trim().toUpperCase();

  // títulos longos precisam de letra mais pequena, ou saem da folha
  const tamanho = titulo.length > 90 ? 68 : titulo.length > 55 ? 84 : 104;

  const arvore = el('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: LARGURA,
      height: ALTURA,
      backgroundColor: INK,
      padding: 90,
      justifyContent: 'space-between',
    },
    children: [
      el('div', {
        style: { display: 'flex', alignItems: 'center' },
        children: [
          el('div', {
            style: {
              display: 'flex',
              backgroundColor: ROSA,
              color: '#FFFFFF',
              fontFamily: 'Poppins',
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: 4,
              padding: '14px 28px',
              borderRadius: 999,
            },
            children: 'ÚLTIMA HORA',
          }),
        ],
      }),

      el('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
        },
        children: [
          el('div', {
            style: {
              display: 'flex',
              color: CREME,
              fontFamily: 'Advercase',
              fontWeight: 700,
              fontSize: tamanho,
              lineHeight: 1.12,
              letterSpacing: -1,
            },
            children: titulo,
          }),
        ],
      }),

      el('div', {
        style: { display: 'flex', flexDirection: 'column' },
        children: [
          el('div', {
            style: { display: 'flex', height: 4, backgroundColor: ROSA, width: 140, marginBottom: 28 },
            children: '',
          }),
          el('div', {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              color: '#9C918B',
              fontFamily: 'Poppins',
              fontWeight: 400,
              fontSize: 28,
            },
            children: [
              el('div', {
                style: { display: 'flex' },
                children: [args.fonte, args.data].filter(Boolean).join(' · ') || 'fonte',
              }),
              el('div', { style: { display: 'flex' }, children: args.handle ?? '@catiacreator' }),
            ],
          }),
        ],
      }),
    ],
  });

  const svg = await satori(arvore as never, {
    width: LARGURA,
    height: ALTURA,
    fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: LARGURA }, background: INK });
  return Buffer.from(resvg.render().asPng());
}

export interface ImagemTrazida {
  buffer: Buffer;
  mime: string;
  origem: string;
}

/** Descarrega e valida uma imagem. Devolve null ao mínimo sinal de lixo. */
async function trazer(src: string, origem: string): Promise<ImagemTrazida | null> {
  const res = await fetch(src, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheCreatorWorks/1.0)' },
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (!res?.ok) return null;

  const mime = res.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
  if (!mime.startsWith('image/') || mime.includes('svg')) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  // logótipos, ícones e gifs de 1px não servem de fundo a nada
  if (buffer.length < 30_000 || buffer.length > 12_000_000) return null;

  return { buffer, mime, origem };
}

/**
 * As imagens do próprio artigo — a que ele declara e as que tem no corpo.
 * São de quem as publicou: servem para um slide de notícia, não para passarem
 * por fotografia dela.
 */
export async function imagensDoArtigo(url: string, quantas = 3): Promise<ImagemTrazida[]> {
  const pagina = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheCreatorWorks/1.0)' },
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (!pagina?.ok) return [];

  const html = (await pagina.text()).slice(0, 600_000);
  const candidatos: string[] = [];

  const meta = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi,
  ];
  for (const re of meta) {
    for (const m of html.matchAll(re)) candidatos.push(m[1]);
  }
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) candidatos.push(m[1]);

  const vistos = new Set<string>();
  const encontradas: ImagemTrazida[] = [];
  const anfitriao = new URL(url).hostname.replace(/^www\./, '');

  for (const cru of candidatos) {
    if (encontradas.length >= quantas) break;
    let src: string;
    try {
      src = new URL(cru.replace(/&amp;/g, '&'), url).toString();
    } catch {
      continue;
    }
    if (vistos.has(src)) continue;
    vistos.add(src);
    if (/logo|icon|avatar|sprite|pixel|badge|favicon/i.test(src)) continue;

    const imagem = await trazer(src, anfitriao);
    if (imagem) encontradas.push(imagem);
  }

  return encontradas;
}

/**
 * Quando o artigo não chega, procura-se imagem livre.
 *
 * Vai ao Openverse — o motor de busca de imagens de licença aberta. O Google
 * não tem busca de imagens aberta a aplicações sem contrato pago, e as que
 * vêm daqui podem ser usadas sem pedir licença a ninguém.
 */
export async function imagensDeBanco(procura: string, quantas = 3): Promise<ImagemTrazida[]> {
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', procura);
  url.searchParams.set('page_size', String(quantas * 3));
  url.searchParams.set('license_type', 'commercial');
  url.searchParams.set('mature', 'false');

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!res?.ok) return [];

  const dados = (await res.json().catch(() => null)) as {
    results?: Array<{ url?: string; source?: string; title?: string }>;
  } | null;

  const encontradas: ImagemTrazida[] = [];
  for (const r of dados?.results ?? []) {
    if (encontradas.length >= quantas) break;
    if (!r.url) continue;
    const imagem = await trazer(r.url, r.source ?? 'banco de imagens');
    if (imagem) encontradas.push(imagem);
  }
  return encontradas;
}
