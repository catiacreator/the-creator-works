import type { Config } from 'tailwindcss';

/**
 * Paleta: branco, preto e rosa.
 *  branco    — fundo da app e cartões
 *  preto     — títulos, texto, botões escuros
 *  rosa      — ações, estados ativos, foco
 *  manteiga  — acento, só em etiquetas de estado
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Estas seis leem variáveis CSS e trocam de valor no modo escuro
        // (ver globals.css). O rosa e a manteiga não trocam: são a marca.
        ink: 'rgb(var(--ink) / <alpha-value>)',            // texto e superfícies invertidas
        carvao: 'rgb(var(--carvao) / <alpha-value>)',      // o ink ao passar o rato
        paper: 'rgb(var(--paper) / <alpha-value>)',        // fundo da página
        superficie: 'rgb(var(--superficie) / <alpha-value>)', // cartões, caixas, campos
        creme: 'rgb(var(--creme) / <alpha-value>)',        // faixas e hover
        sand: 'rgb(var(--sand) / <alpha-value>)',          // bordas
        muted: 'rgb(var(--muted) / <alpha-value>)',        // texto secundário
        rosaSuave: 'rgb(var(--rosa-suave) / <alpha-value>)',
        manteiga: '#F7E3A0',
        rosa: '#EE4E8B',
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
