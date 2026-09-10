/**
 * O leitor de texto da Fábrica.
 *
 * Lê o texto colado e arruma-o em carrosséis, sem pedir nada a ninguém: é
 * tudo expressões regulares, aqui no browser. Por isso não tem limite de
 * tamanho nem custa nada — cola-se um documento inteiro e ele parte-o.
 *
 * Reconhece os feitios em que os carrosséis costumam vir escritos:
 *
 *   CARROSSEL 3 — Título        POST 2: Título        ### Carrossel 4 - Título
 *   **Título em negrito**       09 — Título           1) Título
 *   Slide 1: o texto            Slide 1               • o texto
 *                                 o texto
 *
 * Se não encontrar nada disso, parte pelos parágrafos — um por slide.
 */

export interface CarrosselLido {
  titulo: string;
  slides: string[];
}

export function extrairDoTexto(texto: string): CarrosselLido[] {
  const saida: CarrosselLido[] = [];
  let atual: CarrosselLido | null = null;
  let esperaSlide = false;

  const guardar = () => {
    if (atual && atual.slides.length) saida.push(atual);
  };

  const linhas = String(texto).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha) continue;
    if (/^-{3,}$/.test(linha) || /^={3,}$/.test(linha)) continue;

    let titulo: string | null = null;

    // "CARROSSEL 3 — Título", "POST 2: Título", "### Carrossel 4 - Título"
    const t1 = linha.match(
      /^[#*\s]*(?:CARROSSEL|CARROUSEL|POST|PUBLICAÇÃO|PUBLICACAO)\s*\d*\s*[—–\-:.]?\s*(.+?)[*\s]*$/i,
    );
    if (t1) {
      const t = t1[1].replace(/[*#]/g, '').trim();
      if (t.length >= 2) titulo = t;
    }

    // "**Título em negrito**"
    if (!titulo) {
      const t2 = linha.match(/^\*\*(.{4,140})\*\*$/);
      if (t2 && !/^(Slide|Legenda|Caption|Hook|Gancho|CTA|Passo|Prompt)/i.test(t2[1])) {
        titulo = t2[1].trim();
      }
    }

    // "09 — Título", "1) Título", "12. Título" — só se não parecer um slide
    if (!titulo) {
      const t3 = linha.match(/^[#*\s]*0*(\d{1,3})\s*[—–:]\s+(.{4,200})$/);
      if (t3) {
        const t = t3[2].replace(/[*#]/g, '').trim();
        if (!/^(Slide|Passo|Prompt)/i.test(t)) titulo = t;
      }
    }

    if (titulo) {
      guardar();
      atual = { titulo, slides: [] };
      esperaSlide = false;
      continue;
    }

    // "Slide 1: o texto"
    const s1 = linha.match(/^[—–\-*#\s]*Slide\s*\d+\s*[:\-—–.)]\s*(.+)$/i);
    if (s1) {
      if (!atual) atual = { titulo: 'Carrossel', slides: [] };
      atual.slides.push(s1[1].replace(/\*/g, '').trim());
      esperaSlide = false;
      continue;
    }

    // "Slide 1" sozinho — o texto vem na linha a seguir
    if (/^[—–\-*#\s]*Slide\s*\d+\s*[:\-—–.)]?\s*$/i.test(linha)) {
      if (!atual) atual = { titulo: 'Carrossel', slides: [] };
      esperaSlide = true;
      continue;
    }
    if (esperaSlide && atual) {
      atual.slides.push(linha.replace(/\*/g, '').trim());
      esperaSlide = false;
      continue;
    }

    // listas: "• o texto", "- o texto", "1. o texto"
    const ponto = linha.match(/^[-•*—–]\s+(.{2,})$/);
    const numero = linha.match(/^\d{1,3}[.)]\s+(.{2,})$/);
    const corpo = ponto?.[1] || numero?.[1];
    if (corpo && !/^(Slide|POST|CARROSSEL|PUBLICAÇÃO)/i.test(corpo)) {
      if (!atual) atual = { titulo: 'Carrossel', slides: [] };
      atual.slides.push(corpo.replace(/\*/g, '').trim());
    }
  }
  guardar();

  // nada reconhecido: cada parágrafo passa a ser um slide
  if (!saida.length) {
    const paragrafos = String(texto)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paragrafos.length > 1) saida.push({ titulo: 'Carrossel', slides: paragrafos });
  }

  return saida;
}
