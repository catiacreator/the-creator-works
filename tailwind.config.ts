import type { Config } from 'tailwindcss';

/**
 * Paleta: branco, preto e rosa.
 *  branco    — fundo da app e cartões
 *  preto     — títulos, texto, botões escuros
 *  rosa      — ações, estados ativos, foco
 *  manteiga  — acento, só em etiquetas de estado
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#141010',        // preto quente
        carvao: '#211B1A',     // preto mais claro, para superfícies
        paper: '#FFFFFF',      // fundo — branco
        manteiga: '#F7E3A0',   // amarelo manteiga
        creme: '#F6F4F1',      // superfície suave, para hover e faixas
        sand: '#E8E4DE',       // borda
        rosa: '#EE4E8B',       // rosa principal
        rosaSuave: '#FBDAE7',  // rosa de fundo
        muted: '#8A7C63',
        // superfícies escuras — o editor visual vive em preto
        surface: '#211B1A',
        line: '#352C2A',
        brand: { DEFAULT: '#EE4E8B', soft: '#F888B0', dark: '#DC3F7C' },
        // o editor muda de tema — estas leem variáveis CSS
        edFundo: 'rgb(var(--ed-fundo) / <alpha-value>)',
        edSuperficie: 'rgb(var(--ed-superficie) / <alpha-value>)',
        edLinha: 'rgb(var(--ed-linha) / <alpha-value>)',
        edTexto: 'rgb(var(--ed-texto) / <alpha-value>)',
        edSuave: 'rgb(var(--ed-suave) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(20,16,16,0.04), 0 8px 24px -16px rgba(20,16,16,0.18)',
        lift: '0 2px 4px rgba(20,16,16,0.06), 0 16px 40px -20px rgba(238,78,139,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
