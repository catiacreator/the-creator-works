
/**
 * O caminho onde esta app vive dentro do domínio do CarouselSnap.
 *
 * As duas apps passaram a partilhar um só domínio: o CarouselSnap continua
 * na raiz (`carouselsnap.app/main`, `/renew`, …) e o The Creator Works fica
 * debaixo de `/creator-works`. Quem trata do prefixo nos links do Next
 * (`<Link>`, `router.push`) é o `basePath` do `next.config.mjs`. Quem NÃO
 * trata é tudo o que fala com o browser à mão: `fetch('/api/…')`,
 * `window.location.href`, `<a href>`, `<img src>`, e os redirecionamentos
 * feitos no servidor com um endereço construído à unha.
 *
 * É para esses que isto existe. O valor vem do `next.config.mjs`, por
 * `NEXT_PUBLIC_BASE_PATH`, para haver um sítio só onde o prefixo está escrito.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');

/**
 * Um caminho desta app, já com o prefixo.
 *
 *     comBase('/api/chat')  →  '/creator-works/api/chat'
 *     comBase('/')          →  '/creator-works'   (o Next serve a raiz sem barra final)
 *
 * Endereços completos (`https://…`) e caminhos que já trazem o prefixo
 * passam como estão, para isto poder ser chamado sem medo em cima de valores
 * que vêm de fora.
 */
export function comBase(caminho: string): string {
  if (!BASE_PATH) return caminho;
  if (/^[a-z][a-z0-9+.-]*:/i.test(caminho) || caminho.startsWith('//')) return caminho;
  if (caminho === BASE_PATH || caminho.startsWith(`${BASE_PATH}/`) || caminho.startsWith(`${BASE_PATH}?`)) {
    return caminho;
  }
  if (caminho === '/') return BASE_PATH;
  if (caminho.startsWith('/')) return `${BASE_PATH}${caminho}`;
  return caminho;
}

/**
 * O endereço público desta app, com o prefixo: `https://carouselsnap.app/creator-works`.
 *
 * Vem de `NEXT_PUBLIC_APP_URL` quando está definido (é assim na Vercel); sem
 * ele, deduz-se do pedido — o que serve para o desenvolvimento local e para
 * as pré-visualizações.
 */
export function enderecoDaApp(request?: Request): string {
  const definido = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  if (definido) {
    // um valor antigo, só com o domínio, ganha o prefixo em vez de mandar
    // os links de email e do OAuth para a raiz — que agora é o CarouselSnap
    return BASE_PATH && !definido.endsWith(BASE_PATH) ? `${definido}${BASE_PATH}` : definido;
  }
  if (!request) return BASE_PATH || '';
  return `${new URL(request.url).origin}${BASE_PATH}`;
}

/** Um endereço completo para um caminho desta app: `enderecoDaApp() + caminho`. */
export function urlDaApp(caminho: string, request?: Request): string {
  const base = enderecoDaApp(request);
  if (caminho === '/' || caminho === '') return base || '/';
  return `${base}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}
