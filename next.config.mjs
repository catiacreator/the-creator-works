/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deixa uma verificação (`NEXT_DIST_DIR=.next-build npm run build`) compilar
  // para outra pasta, sem estragar a cache do servidor de desenvolvimento.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // pdf-parse, mammoth, satori e resvg são nativos/CJS — não os empacotar no bundle do servidor.
  experimental: {
    // As fontes vivem em /fonts e são lidas do disco em tempo de execução.
    // Sem isto, o alojamento não as leva no pacote e os slides saem com outra
    // letra — a Advercase desapareceria em produção.
    outputFileTracingIncludes: {
      '/api/**/*': ['./fonts/**/*'],
    },
    serverComponentsExternalPackages: [
      'pdf-parse',
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
};

export default nextConfig;
