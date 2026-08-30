/**
 * As famílias que a app sabe compor.
 * Cada uma existe em dois sítios: em `fonts/`, para o motor do servidor, e
 * carregada no browser, para o editor mostrar o mesmo que vai sair no PNG.
 * Acrescentar uma é pôr o ficheiro em `fonts/` como `Familia-400.woff` (ou
 * .ttf), garantir que carrega no browser, e juntá-la a esta lista.
 */
export const FONTES = [
  // a tua marca
  { valor: 'Advercase', nome: 'Advercase', css: "'Advercase', system-ui, sans-serif", grupo: 'Tuas' },
  { valor: 'Ramdone', nome: 'Ramdone', css: "'Ramdone', cursive", grupo: 'Tuas' },

  // sem serifa
  { valor: 'Poppins', nome: 'Poppins', css: "'Poppins', system-ui, sans-serif", grupo: 'Sem serifa' },
  { valor: 'Inter', nome: 'Inter', css: "'Inter', system-ui, sans-serif", grupo: 'Sem serifa' },
  { valor: 'Montserrat', nome: 'Montserrat', css: "'Montserrat', system-ui, sans-serif", grupo: 'Sem serifa' },
  { valor: 'DMSans', nome: 'DM Sans', css: "'DM Sans', system-ui, sans-serif", grupo: 'Sem serifa' },
  { valor: 'Raleway', nome: 'Raleway', css: "'Raleway', system-ui, sans-serif", grupo: 'Sem serifa' },
  { valor: 'Nunito', nome: 'Nunito', css: "'Nunito', system-ui, sans-serif", grupo: 'Sem serifa' },
  { valor: 'SpaceGrotesk', nome: 'Space Grotesk', css: "'Space Grotesk', system-ui, sans-serif", grupo: 'Sem serifa' },

  // com serifa
  { valor: 'Playfair', nome: 'Playfair', css: "'Playfair Display', Georgia, serif", grupo: 'Com serifa' },
  { valor: 'Lora', nome: 'Lora', css: "'Lora', Georgia, serif", grupo: 'Com serifa' },
  { valor: 'Baskerville', nome: 'Baskerville', css: "'Libre Baskerville', Georgia, serif", grupo: 'Com serifa' },

  // impacto — para capas
  { valor: 'Bebas', nome: 'Bebas Neue', css: "'Bebas Neue', Impact, sans-serif", grupo: 'Impacto' },
  { valor: 'Anton', nome: 'Anton', css: "'Anton', Impact, sans-serif", grupo: 'Impacto' },
  { valor: 'ArchivoBlack', nome: 'Archivo Black', css: "'Archivo Black', Impact, sans-serif", grupo: 'Impacto' },
  { valor: 'Oswald', nome: 'Oswald', css: "'Oswald', Impact, sans-serif", grupo: 'Impacto' },
] as const;

export type Fonte = (typeof FONTES)[number]['valor'];
export type GrupoDeFontes = (typeof FONTES)[number]['grupo'];

export const GRUPOS: GrupoDeFontes[] = ['Tuas', 'Sem serifa', 'Com serifa', 'Impacto'];

export function cssDaFonte(valor?: string | null) {
  return FONTES.find((f) => f.valor === valor)?.css ?? 'inherit';
}
