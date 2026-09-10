/**
 * O leitor de texto da Fábrica.
 *
 * Lê o texto colado e arruma-o em carrosséis, sem pedir nada a ninguém: é
 * tudo expressões regulares, aqui no browser. Por isso não tem limite de
 * tamanho nem custa nada — cola-se um documento inteiro e ele parte-o.
 *
 * Reconhece os feitios em que os carrosséis costumam vir escritos:
 *
 *   CARROSSEL 3 — Título        POST 2: Título        ### Título
 *   **Título em negrito**       09 — Título           1) Título
 *   Slide 1: o texto            **Slide 1:** o texto  Slide 1
 *   • o texto                   1. o texto              o texto
 *
 * E há uma regra que vale mais do que todas as outras, porque não depende de
 * feitio nenhum: **quando a numeração dos slides volta a 1, começou um
 * carrossel novo.** É o que salva os documentos cujos títulos vêm escritos de
 * uma maneira que ninguém previu.
 *
 * Quando nem assim se encontra mais do que um carrossel, a página pergunta à
 * Cát.IA — mas isso é lá, não aqui.
 */

/** Marca os que ficaram sem nome, para os numerar no fim. */
const SEM_NOME = '\u0000sem-nome';

export interface CarrosselLido {
  titulo: string;
  slides: string[];
}

/** Uma linha que marca um slide: devolve o número e o texto, se lá estiver. */
function lerSlide(linha: string): { n: number; texto: string | null } | null {
  // "Slide 1: texto", "**Slide 1:** texto", "— Slide 1 - texto"
  const comTexto = linha.match(/^[—–\-*#\s]*Slide\s*(\d+)\s*[:\-—–.)]\s*\**\s*(.+?)\**\s*$/i);
  if (comTexto) {
    return { n: Number(comTexto[1]), texto: comTexto[2].replace(/\*/g, '').trim() };
  }
  // "Slide 1" sozinho — o texto vem na linha a seguir
  const sozinho = linha.match(/^[—–\-*#\s]*Slide\s*(\d+)\s*[:\-—–.)]?\s*\**\s*$/i);
  if (sozinho) return { n: Number(sozinho[1]), texto: null };
  return null;
}

/** Uma linha que parece um título de carrossel — pelo feitio, não pelo lugar. */
function lerTitulo(linha: string): string | null {
  // "CARROSSEL 3 — Título", "POST 2: Título", "### Carrossel 4 - Título"
  const t1 = linha.match(
    /^[#*\s]*(?:CARROSSEL|CARROUSEL|POST|PUBLICAÇÃO|PUBLICACAO)\s*\d*\s*[—–\-:.]?\s*(.+?)[*\s]*$/i,
  );
  if (t1) {
    const t = t1[1].replace(/[*#]/g, '').trim();
    if (t.length >= 2) return t;
  }

  // "## Título" — cabeçalho de markdown
  const t2 = linha.match(/^#{1,4}\s+(.{2,140})$/);
  if (t2) {
    const t = t2[1].replace(/[*#]/g, '').trim();
    if (t.length >= 2 && !/^Slide\s*\d/i.test(t)) return t;
  }

  // "**Título em negrito**"
  const t3 = linha.match(/^\*\*(.{4,140})\*\*$/);
  if (t3 && !/^(Slide|Legenda|Caption|Hook|Gancho|CTA|Passo|Prompt)/i.test(t3[1])) {
    return t3[1].trim();
  }

  // "09 — Título", "1) Título", "12. Título" — só se não parecer um slide
  const t4 = linha.match(/^[#*\s]*0*(\d{1,3})\s*[—–:]\s+(.{4,200})$/);
  if (t4) {
    const t = t4[2].replace(/[*#]/g, '').trim();
    if (!/^(Slide|Passo|Prompt)/i.test(t)) return t;
  }

  return null;
}

/** Serve para título de recurso: uma linha curta, sem marcas de slide. */
function podeSerTitulo(linha: string): boolean {
  const l = linha.replace(/[*#]/g, '').trim();
  if (l.length < 2 || l.length > 140) return false;
  if (lerSlide(linha)) return false;
  if (/^[-•*—–]\s/.test(linha)) return false;
  if (/^\d{1,3}[.)]\s/.test(linha)) return false;
  if (/^-{3,}$/.test(l) || /^={3,}$/.test(l)) return false;
  return true;
}

export function extrairDoTexto(texto: string): CarrosselLido[] {
  const saida: CarrosselLido[] = [];
  let atual: CarrosselLido | null = null;
  let esperaSlide = false;
  /** A última linha que podia ser um título, para quando a numeração recomeça. */
  let tituloEmEspera: string | null = null;

  const guardar = () => {
    if (atual && atual.slides.length) saida.push(atual);
  };

  const comecar = (titulo: string) => {
    guardar();
    atual = { titulo, slides: [] };
    esperaSlide = false;
    tituloEmEspera = null;
  };

  const linhas = String(texto).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha) continue;
    if (/^-{3,}$/.test(linha) || /^={3,}$/.test(linha)) continue;

    // 1. um título declarado manda sempre
    const titulo = lerTitulo(linha);
    if (titulo) {
      comecar(titulo);
      continue;
    }

    // 2. um slide — e é aqui que se apanha o recomeço da numeração
    const slide = lerSlide(linha);
    if (slide) {
      if (slide.n === 1 && atual && atual.slides.length) {
        // a numeração voltou ao princípio: carrossel novo, com o último
        // título à espera se houver um, ou um nome de circunstância
        comecar(tituloEmEspera ?? SEM_NOME);
      }
      if (!atual) atual = { titulo: tituloEmEspera ?? SEM_NOME, slides: [] };
      tituloEmEspera = null;

      if (slide.texto) {
        atual.slides.push(slide.texto);
        esperaSlide = false;
      } else {
        esperaSlide = true;
      }
      continue;
    }

    // 3. o texto de um "Slide 1" que veio sozinho
    if (esperaSlide && atual) {
      atual.slides.push(linha.replace(/\*/g, '').trim());
      esperaSlide = false;
      continue;
    }

    // 4. listas
    const ponto = linha.match(/^[-•*—–]\s+(.{2,})$/);
    const numero = linha.match(/^\d{1,3}[.)]\s+(.{2,})$/);
    const corpo = ponto?.[1] || numero?.[1];
    if (corpo && !/^(Slide|POST|CARROSSEL|PUBLICAÇÃO)/i.test(corpo)) {
      if (!atual) atual = { titulo: tituloEmEspera ?? SEM_NOME, slides: [] };
      tituloEmEspera = null;
      atual.slides.push(corpo.replace(/\*/g, '').trim());
      continue;
    }

    // 5. não é nada disto: fica de parte, a ver se serve de título ao próximo
    if (podeSerTitulo(linha)) tituloEmEspera = linha.replace(/[*#]/g, '').trim();
  }
  guardar();

  // os que ficaram sem nome levam um número, por ordem de aparição
  const varios = saida.length > 1;
  saida.forEach((c, i) => {
    if (c.titulo === SEM_NOME) c.titulo = varios ? `Carrossel ${i + 1}` : 'Carrossel';
  });

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
