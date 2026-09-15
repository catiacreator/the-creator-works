import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * O CarouselSnap, servido daqui.
 *
 * As duas apps partilham um domínio, e quem responde por ele é este Next.
 * Tudo o que não é `/creator-works` cai aqui (ver `rewrites` no
 * `next.config.mjs`) e vai buscar-se ao sítio onde o Lovable publica o
 * CarouselSnap — `CAROUSELSNAP_ORIGEM`.
 *
 * Porque é que isto é uma rota e não só uma regra de reescrita: o Lovable,
 * enquanto tiver o domínio `carouselsnap.app` ligado ao projeto, responde ao
 * endereço `…lovable.app` com um redirecionamento para esse domínio. Uma
 * reescrita entrega o redirecionamento ao browser tal e qual, e a pessoa
 * sai daqui e vai parar ao domínio antigo — foi isso que aconteceu ao botão
 * «Voltar ao CarouselSnap» na pré-visualização. Aqui os redirecionamentos
 * seguem-se do lado do servidor, e o browser fica sempre no mesmo domínio.
 *
 * O único redirecionamento que não se segue é o que aponta para o próprio
 * domínio onde esta app está: seguir esse era voltar a bater aqui, e daqui
 * outra vez ao Lovable, sem fim. Quando isso acontece a causa é uma só — o
 * domínio ainda está ligado ao projeto no Lovable — e diz-se, em vez de se
 * rebentar em silêncio.
 */

const SALTOS = 5;

/** Cabeçalhos do pedido que fazem sentido levar ao Lovable. */
const LEVAR = ['accept', 'accept-language', 'user-agent', 'if-none-match', 'if-modified-since', 'range'];

/** Cabeçalhos da resposta que não se devolvem: o corpo já vem descomprimido. */
const NAO_DEVOLVER = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'set-cookie',
  'alt-svc',
]);

function origem(): string {
  return (process.env.CAROUSELSNAP_ORIGEM ?? '').trim().replace(/\/+$/, '');
}

function pagina(titulo: string, texto: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>${titulo}</title>
<style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:12vh auto;padding:0 1.5rem;line-height:1.6;color:#1a1a1a}h1{font-size:1.4rem}code{background:#f2f2f2;padding:.1rem .35rem;border-radius:.3rem}</style>
</head><body><h1>${titulo}</h1><p>${texto}</p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

type Contexto = { params: { caminho?: string[] } };

async function servir(request: Request, { params }: Contexto, comCorpo: boolean) {
  const base = origem();
  const pedido = new URL(request.url);
  const meuHost = request.headers.get('host') ?? pedido.host;

  if (!base) {
    return pagina(
      'O CarouselSnap ainda não está ligado aqui',
      'Falta a variável <code>CAROUSELSNAP_ORIGEM</code> na Vercel, com o endereço onde o Lovable publica o CarouselSnap (o <code>…lovable.app</code>). Sem ela, este domínio só serve o <code>/creator-works</code>.',
      503,
    );
  }

  // o caminho pedido, tal como veio: os segmentos que a reescrita nos deu
  const caminho = `/${(params.caminho ?? []).map(encodeURIComponent).join('/')}`;
  let destino = `${base}${caminho}${pedido.search}`;

  const cabecalhos = new Headers();
  for (const nome of LEVAR) {
    const valor = request.headers.get(nome);
    if (valor) cabecalhos.set(nome, valor);
  }

  for (let salto = 0; salto <= SALTOS; salto++) {
    const resposta = await fetch(destino, {
      method: comCorpo ? 'GET' : 'HEAD',
      headers: cabecalhos,
      redirect: 'manual',
      cache: 'no-store',
    });

    const local = resposta.headers.get('location');
    if (resposta.status >= 300 && resposta.status < 400 && local) {
      const proximo = new URL(local, destino);

      if (proximo.host === meuHost) {
        // apontou para nós: o Lovable ainda manda o `…lovable.app` para o
        // domínio, e o domínio agora é este. Seguir era andar em círculos.
        return pagina(
          'O domínio ainda está ligado no Lovable',
          `O Lovable está a redirecionar o CarouselSnap para <code>${proximo.host}</code>, que é este mesmo domínio. Em <em>Project → Settings → Domains</em> do projeto CarouselSnap no Lovable, remove o domínio <code>${proximo.host}</code>: quem responde por ele agora é a Vercel, e o Lovable só tem de servir o <code>…lovable.app</code>.`,
          508,
        );
      }

      destino = proximo.toString();
      continue;
    }

    const devolver = new Headers();
    resposta.headers.forEach((valor, nome) => {
      if (!NAO_DEVOLVER.has(nome.toLowerCase())) devolver.set(nome, valor);
    });

    return new NextResponse(comCorpo ? resposta.body : null, {
      status: resposta.status,
      headers: devolver,
    });
  }

  return pagina('Demasiados redirecionamentos', 'O CarouselSnap não parou de redirecionar. Confere o endereço em <code>CAROUSELSNAP_ORIGEM</code>.', 508);
}

export async function GET(request: Request, contexto: Contexto) {
  try {
    return await servir(request, contexto, true);
  } catch (e) {
    console.error('[espelho] não deu para ir buscar o CarouselSnap:', e);
    return pagina('O CarouselSnap não respondeu', 'Não deu para ir buscar a página ao Lovable. Tenta outra vez daqui a um momento.', 502);
  }
}

export async function HEAD(request: Request, contexto: Contexto) {
  try {
    return await servir(request, contexto, false);
  } catch {
    return new Response(null, { status: 502 });
  }
}
