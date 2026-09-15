/**
 * Onde esta app vive: debaixo de `/creator-works`, no domínio do CarouselSnap.
 *
 * As duas apps partilham um só domínio. Este Next é quem responde por ele na
 * Vercel: serve o que está debaixo de BASE_PATH e reencaminha tudo o resto
 * — a raiz, o /main, o /renew, os ficheiros do Vite — para o sítio onde o
 * Lovable publica o CarouselSnap (`CAROUSELSNAP_ORIGEM`). Do lado de fora
 * vê-se um domínio só; por dentro continuam a ser dois projetos.
 *
 * O prefixo está escrito aqui e em mais lado nenhum: o código lê-o por
 * `NEXT_PUBLIC_BASE_PATH` (ver `src/lib/caminho.ts`).
 */
const BASE_PATH = '/creator-works';

/** O endereço público desta app, para os redirecionamentos do domínio antigo. */
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '');

/** Os domínios por onde a app já não se serve: quem lá chegar é mandado para o novo. */
const DOMINIOS_ANTIGOS = ['thecreatorworks.com', 'www.thecreatorworks.com'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  // Deixa uma verificação (`NEXT_DIST_DIR=.next-build npm run build`) compilar
  // para outra pasta, sem estragar a cache do servidor de desenvolvimento.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // pdf-parse, mammoth, satori e resvg são nativos/CJS — não os empacotar no bundle do servidor.
  experimental: {
    // As fontes vivem em /fonts e são lidas do disco em tempo de execução.
    // Sem isto, o alojamento não as leva no pacote e os slides saem com outra
    // letra — a Advercase desapareceria em produção.
    outputFileTracingIncludes: {
      // as letras e o logótipo entram no Documento Mestre, lidos do disco
      '/api/**/*': ['./fonts/**/*', './public/the-creator-works.png'],
    },
    serverComponentsExternalPackages: [
      'pdf-parse',
      'pdfkit',
      'mammoth',
      'satori',
      '@resvg/resvg-js',
      'sharp',
      'archiver',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.canva.com' },
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net' },
    ],
  },

  /**
   * O domínio antigo continua a levar à app.
   *
   * Um link guardado, um email antigo da Hotmart, um marcador no browser:
   * tudo o que aponte a `thecreatorworks.com/qualquer-coisa` passa a cair em
   * `NEXT_PUBLIC_APP_URL/qualquer-coisa`. Só faz efeito enquanto o domínio
   * antigo continuar a apontar para este projeto na Vercel; sem
   * `NEXT_PUBLIC_APP_URL` não há para onde mandar e não se mete ninguém em
   * ciclos.
   */
  async redirects() {
    if (!APP_URL) return [];
    const semPrefixo = BASE_PATH.slice(1);
    return DOMINIOS_ANTIGOS.flatMap((host) => [
      {
        // já com o prefixo: muda-se só o domínio
        source: `${BASE_PATH}/:path*`,
        has: [{ type: 'host', value: host }],
        destination: `${APP_URL}/:path*`,
        permanent: true,
        basePath: false,
      },
      {
        // sem o prefixo (os endereços de sempre): ganha-o
        source: `/:path((?!${semPrefixo}(?:/|$)).*)`,
        has: [{ type: 'host', value: host }],
        destination: `${APP_URL}/:path*`,
        permanent: true,
        basePath: false,
      },
    ]);
  },

  /**
   * Tudo o que não é desta app é do CarouselSnap.
   *
   * `fallback` corre só depois de o Next não ter encontrado nada seu — nem
   * página, nem rota de API, nem ficheiro em `public/`. O que sobra vai para
   * a rota `espelho`, que o vai buscar ao Lovable (`CAROUSELSNAP_ORIGEM`) e o
   * devolve como se fosse daqui, com o domínio à vista igual. É isto que faz
   * `carouselsnap.app/main` abrir o CarouselSnap e
   * `carouselsnap.app/creator-works/criar` abrir esta app.
   *
   * Vai por uma rota, e não direto ao Lovable, porque o Lovable responde com
   * um redirecionamento para o domínio personalizado enquanto o tiver ligado
   * — e uma reescrita direta entregava esse salto ao browser. A rota segue-o
   * do lado do servidor (ver `src/app/espelho/[[...caminho]]/route.ts`).
   *
   * O destino leva o próprio domínio do pedido por inteiro (`:host`, tirado
   * do cabeçalho Host) porque o Next só deixa uma reescrita fora do basePath
   * apontar a um endereço completo — não a um caminho interno. Na Vercel é
   * https; a correr à mão (`next start`) é http.
   *
   * O que já está debaixo de BASE_PATH nunca é reencaminhado: uma página que
   * não existe aqui é um 404 desta app, não uma página do CarouselSnap.
   */
  async rewrites() {
    const semPrefixo = BASE_PATH.slice(1);
    const esquema = process.env.VERCEL ? 'https' : 'http';
    return {
      fallback: [
        {
          // a raiz à parte: com `:path*` vazio o destino acabava em barra e o
          // Next respondia com um 308 para a tirar, que ia parar ao browser
          source: '/',
          has: [{ type: 'host', value: '(?<host>.*)' }],
          destination: `${esquema}://:host${BASE_PATH}/espelho`,
          basePath: false,
        },
        {
          source: `/:path((?!${semPrefixo}(?:/|$)).*)`,
          has: [{ type: 'host', value: '(?<host>.*)' }],
          destination: `${esquema}://:host${BASE_PATH}/espelho/:path*`,
          basePath: false,
        },
      ],
    };
  },
};

export default nextConfig;
