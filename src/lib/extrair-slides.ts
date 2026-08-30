/**
 * Lê um texto colado e tira dali os carrosséis.
 *
 * Não usa IA de propósito: o texto que ela cola já vem escrito por ela ou pela
 * Cát.IA, e o que falta é só perceber onde acaba um slide e começa o outro.
 * É instantâneo — e o que se ganhava em mandar isto a um modelo perdia-se em
 * espera.
 *
 * O que se apanha, por esta ordem:
 *   1. cabeçalhos de carrossel — "CARROSSEL 2 — Título", "## Post 3"
 *   2. cabeçalhos de slide — "Slide 1:", "**Slide 3 (capa)**", "CAPA:", "CTA:"
 *      com o texto na mesma linha OU nas linhas seguintes
 *   3. listas — só quando não há cabeçalhos de slide, senão a lista é o corpo
 *      de um slide e não slides à parte
 */

export interface CarrosselLido {
  titulo: string;
  slides: string[];
  /** Quando o documento traz a legenda à parte dos slides. */
  legenda?: string;
}

/** Tira o que é decoração: asteriscos, cardinais, aspas de bloco. */
function limpar(linha: string) {
  return linha
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^>\s*/, '')
    .replace(/^\*|\*$/g, '')
    .trim();
}

const CARROSSEL =
  /^(?:carrossel|carrousel|carousel|post|publica[çc][ãa]o)\s*(?:n[.º°]?\s*)?\d*\s*[—–\-:.)]?\s*(.*)$/i;

/** "Slide 3", "Slide 3 (capa)", "Capa", "CTA", "Slide final" — com ou sem texto atrás. */
const SLIDE =
  /^(?:slide|cart[ãa]o|p[áa]gina)\s*(\d{1,2}|final|capa)?\s*(?:\([^)]*\))?\s*[:\-—–.)]?\s*(.*)$/i;
const CAPA_OU_CTA = /^(capa|cta|chamada(?:\s+[àa]\s+a[çc][ãa]o)?|legenda)\s*[:\-—–.)]?\s*(.*)$/i;

/**
 * Bancos de conteúdo: uma entrada numerada por carrossel, e dentro dela as
 * secções SLIDES e LEGENDA. É como saem os documentos exportados de um perfil,
 * e cada linha dentro de SLIDES é um slide — não um parágrafo.
 */
function porSeccoes(linhas: string[]): CarrosselLido[] {
  const encontrados: CarrosselLido[] = [];
  let atual: CarrosselLido | null = null;
  let modo: 'slides' | 'legenda' | null = null;
  let legenda: string[] = [];

  const fechar = () => {
    if (atual) {
      if (legenda.length) atual.legenda = legenda.join(' ').replace(/\s+/g, ' ').trim();
      if (atual.slides.length >= 2) encontrados.push(atual);
    }
    atual = null;
    modo = null;
    legenda = [];
  };

  for (const bruta of linhas) {
    const linha = limpar(bruta);
    if (!linha || /^[-–—_=]{3,}$/.test(linha)) continue;

    // "293. 25 ago 2026 — Título"
    const cabecalho = linha.match(/^(\d{1,4})[.)]\s+(.{3,})$/);
    if (cabecalho) {
      fechar();
      const resto = cabecalho[2]
        // a data à cabeça não é título
        .replace(
          /^\d{1,2}\s+\p{L}{3,}\.?\s+\d{4}\s*[—–-]\s*/u,
          '',
        )
        .trim();
      atual = { titulo: resto.slice(0, 90) || `Carrossel ${cabecalho[1]}`, slides: [] };
      continue;
    }

    // as secções de dentro de cada entrada
    if (/^slides?$/i.test(linha)) {
      modo = 'slides';
      continue;
    }
    if (/^(legenda|caption|descri[çc][ãa]o)$/i.test(linha)) {
      modo = 'legenda';
      continue;
    }

    if (!atual || !modo) continue;

    if (modo === 'legenda') {
      legenda.push(linha);
      continue;
    }

    // "(slide final — sem texto legível)" é uma nota do documento, não um slide
    if (/^\(.*\)$/.test(linha)) continue;
    atual.slides.push(linha);
  }

  fechar();
  return encontrados;
}

export function extrairCarrosseis(
  texto: string,
  /**
   * Em último recurso, tratar cada parágrafo como um slide.
   * Serve para texto colado à pressa; não serve para um PDF, onde os
   * parágrafos são parágrafos e não slides.
   */
  comRecurso = true,
): CarrosselLido[] {
  const linhas = String(texto).replace(/\r/g, '').split('\n');

  // documento com secções SLIDES/LEGENDA? então é um banco de conteúdo
  if (linhas.some((l) => /^slides?$/i.test(limpar(l)))) {
    const porBanco = porSeccoes(linhas);
    if (porBanco.length) return porBanco;
  }

  const encontrados: CarrosselLido[] = [];
  let atual: CarrosselLido | null = null;
  /** As linhas do slide que está a ser lido. */
  let corpo: string[] = [];
  /** Houve cabeçalhos de slide neste carrossel? Se sim, listas são corpo. */
  let comCabecalhos = false;

  const fecharSlide = () => {
    const t = corpo.join(' ').replace(/\s+/g, ' ').trim();
    corpo = [];
    if (t && atual) atual.slides.push(t);
  };

  const fecharCarrossel = () => {
    fecharSlide();
    if (atual?.slides.length) encontrados.push(atual);
    atual = null;
    comCabecalhos = false;
  };

  for (const bruta of linhas) {
    const linha = limpar(bruta);
    if (!linha || /^[-–—_=]{3,}$/.test(linha)) continue;

    // ── um carrossel novo ──
    const carrossel = linha.match(CARROSSEL);
    if (carrossel && /^(?:carrossel|carrousel|carousel|post|publica)/i.test(linha)) {
      fecharCarrossel();
      atual = { titulo: (carrossel[1] || 'Carrossel').replace(/[*#]/g, '').trim(), slides: [] };
      continue;
    }

    // ── um slide novo ──
    const slide = linha.match(SLIDE);
    const capa = linha.match(CAPA_OU_CTA);
    const ehCabecalhoDeSlide =
      (slide && /^(?:slide|cart[ãa]o|p[áa]gina)\b/i.test(linha)) || (capa && linha.length < 60);

    if (ehCabecalhoDeSlide) {
      fecharSlide();
      if (!atual) atual = { titulo: 'Carrossel', slides: [] };
      comCabecalhos = true;
      const resto = ((slide ? slide[2] : capa?.[2]) ?? '').trim();
      if (resto) corpo.push(resto);
      continue;
    }

    // ── listas: só valem por slides quando não há cabeçalhos ──
    const traco = linha.match(/^[-•*+]\s+(.{2,})$/);
    const numero = linha.match(/^\d{1,2}[.)]\s+(.{2,})$/);
    if (!comCabecalhos && (traco || numero)) {
      fecharSlide();
      if (!atual) atual = { titulo: 'Carrossel', slides: [] };
      corpo.push((traco?.[1] ?? numero?.[1] ?? '').trim());
      fecharSlide();
      continue;
    }

    // ── linha normal: é o corpo do slide que está aberto ──
    if (atual) {
      corpo.push(traco?.[1] ?? numero?.[1] ?? linha);
    } else if (comRecurso) {
      // ainda não há carrossel nenhum: guarda-se para o último recurso
      corpo.push(linha);
    }
  }

  fecharCarrossel();

  // último recurso: sem marcações nenhumas, cada parágrafo vale um slide
  if (!encontrados.length && comRecurso) {
    const paragrafos = String(texto)
      .split(/\n\s*\n/)
      .map((p) => limpar(p).replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (paragrafos.length > 1) {
      encontrados.push({ titulo: paragrafos[0].slice(0, 60), slides: paragrafos });
    }
  }

  // um carrossel de um slide só quase nunca é um carrossel
  return encontrados.filter((c) => c.slides.length >= 2);
}
