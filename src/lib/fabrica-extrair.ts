/**
 * O leitor de texto da Fábrica.
 *
 * Lê o texto colado e arruma-o em carrosséis, sem pedir nada a ninguém: é
 * tudo expressões regulares, aqui no browser. Por isso não tem limite de
 * tamanho nem custa nada — cola-se um documento inteiro e ele parte-o.
 *
 * Há dois feitios de documento, e o leitor decide qual é antes de começar:
 *
 *   **Com marcas.** O documento diz onde estão os slides — "Slide 1:", uma
 *   lista de pontos, uma lista numerada. Lê-se linha a linha, e a numeração
 *   manda: quando volta a 1, começou um carrossel novo.
 *
 *   **Sem marcas nenhumas.** Só títulos e parágrafos, que é o que sai de um
 *   PDF ou de um Word. Aqui o que separa é o branco entre blocos e as linhas
 *   de --- , e um título reconhece-se por ser curto e estar sozinho à cabeça.
 *
 * Duas armadilhas apanhadas por testes, que valem por metade deste ficheiro:
 *
 *   1. **Rótulos de secção não são títulos de carrossel.** Um documento
 *      escrito com "**Gancho**", "**Desenvolvimento**", "**CTA**" pelo meio
 *      partia-se em quatro carrosséis onde só havia um. Não se resolve com uma
 *      lista de palavras proibidas — resolve-se com a numeração: se os slides
 *      continuam a contar por cima do rótulo, o rótulo não abriu nada.
 *
 *   2. **"1) Nome do tema" pode ser um título ou um slide.** A linha sozinha
 *      não chega para saber. O que diz é o que vem a seguir: se for um
 *      "Slide 1:", era um título.
 *
 * Quando mesmo assim o resultado não presta, a página pede à Cát.IA — mas
 * isso é lá, não aqui.
 */

/** Marca os que ficaram sem nome, para os numerar no fim. */
const SEM_NOME = '@@sem-nome@@';

export interface CarrosselLido {
  titulo: string;
  slides: string[];
}

/** Um carrossel a ser feito, com a conta dos números de slide que viu. */
interface EmObra extends CarrosselLido {
  /** Os números dos "Slide n" encontrados, por ordem. */
  numeros: number[];
  /** Foi um título que o abriu — e não a numeração a recomeçar? */
  porTitulo: boolean;
}

/** Rótulos de secção que aparecem dentro de um carrossel — nunca são títulos. */
const ROTULOS =
  /^(slide|legenda|caption|hook|gancho|cta|passo|prompt|desenvolvimento|conclus[ãa]o|introdu[çc][ãa]o|corpo|texto|imagem|visual|copy|dica|nota|obs|observa[çc][ãa]o)\b/i;

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

/** Uma linha de --- ou === , que separa o que vem antes do que vem depois. */
function eSeparador(linha: string): boolean {
  return /^[-=_*]{3,}$/.test(linha.replace(/\s/g, ''));
}

/** Uma linha escrita toda em maiúsculas: é assim que vêm os títulos num PDF. */
function tituloEmMaiusculas(linha: string): string | null {
  const l = linha.replace(/[*#]/g, '').trim();
  if (l.length < 3 || l.length > 70) return null;
  if (/^[-•*—–]\s/.test(l) || /^\d{1,3}[.)]\s/.test(l)) return null;
  const letras = l.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letras.length < 3) return null;
  if (letras !== letras.toUpperCase()) return null;
  if (ROTULOS.test(l)) return null;
  return l;
}

/**
 * Tira o enfeite da frente de uma linha.
 *
 * Os títulos vêm muitas vezes com um emoji à cabeça — "🔥 CARROSSEL 1 — Nome".
 * Sem isto, o emoji tapa o título e o documento inteiro vem colado num
 * carrossel só. Os traços e os pontos de lista não se tiram, que esses são o
 * que distingue um slide de um título.
 */
function semEnfeite(linha: string): string {
  return linha.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\s]+/u, '');
}

/** Uma linha que parece um título de carrossel — pelo feitio, não pelo lugar. */
function lerTitulo(bruta: string): string | null {
  const linha = semEnfeite(bruta);

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
  if (t3 && !ROTULOS.test(t3[1])) return t3[1].trim();

  // "09 — Título", "12: Título" — só se não parecer um rótulo
  const t4 = linha.match(/^[#*\s]*0*\d{1,3}\s*[—–:]\s+(.{4,200})$/);
  if (t4) {
    const t = t4[1].replace(/[*#]/g, '').trim();
    if (!ROTULOS.test(t)) return t;
  }

  // TÍTULO EM MAIÚSCULAS
  return tituloEmMaiusculas(linha);
}

/** Serve para título de recurso: uma linha curta, sem marcas de slide. */
function podeSerTitulo(linha: string): boolean {
  const l = linha.replace(/[*#]/g, '').trim();
  if (l.length < 2 || l.length > 140) return false;
  if (lerSlide(linha)) return false;
  if (/^[-•*—–]\s/.test(linha)) return false;
  if (/^\d{1,3}[.)]\s/.test(linha)) return false;
  if (eSeparador(l)) return false;
  return true;
}

/** O corpo de uma linha de lista — "• isto", "1. isto", "- isto". */
function corpoDeLista(linha: string): string | null {
  const ponto = linha.match(/^[-•*—–]\s+(.{2,})$/);
  const numero = linha.match(/^\d{1,3}[.)]\s+(.{2,})$/);
  const corpo = ponto?.[1] || numero?.[1];
  if (!corpo) return null;
  if (/^(Slide|POST|CARROSSEL|PUBLICAÇÃO)/i.test(corpo)) return null;
  return corpo.replace(/\*/g, '').trim();
}

/** "Legenda:", "CTA:", "Gancho —" — um rótulo sozinho, que não é texto de slide. */
function eRotuloSolto(linha: string): boolean {
  const l = semEnfeite(linha).replace(/[*#]/g, '').trim();
  return ROTULOS.test(l) && /^[\wÀ-ÿ\s+/]{2,30}\s*[:\-—–]/.test(l);
}

/**
 * O corpo de um slide: tudo o que vem depois do marcador até ao próximo.
 *
 * Aqui está a armadilha que estragava os carrosséis inteiros. Há duas maneiras
 * de escrever um slide, e são incompatíveis à vista:
 *
 *     Slide 1: O primeiro passo é o mais difícil     ← o texto está na marca
 *
 *     Slide 1 — Gancho                               ← a marca traz um rótulo
 *     Apaga a tua bio e experimenta esta estrutura.     e o texto vem por baixo
 *     Demora 30 segundos a perceber.
 *
 * Quem só lê a linha da marca fica com "Gancho" e deita fora o carrossel todo.
 * O que separa os dois casos não é o feitio da linha — é se há texto por baixo
 * dela. Havendo, o que estava na marca era um rótulo: um nome curto, sem ponto
 * final. Não havendo, era mesmo o texto do slide.
 *
 * As linhas em branco lá do meio ficam como estavam, que é o que faz os
 * parágrafos aparecerem no slide em vez de vir tudo corrido.
 */
function corpoDoSlide(
  linhas: string[],
  desde: number,
  naMarca: string | null,
): { texto: string; proxima: number } {
  const juntas: string[] = [];
  let j = desde;
  for (; j < linhas.length; j++) {
    const l = linhas[j].trim();
    if (!l) {
      juntas.push('');
      continue;
    }
    if (lerSlide(l) || eSeparador(l) || lerTitulo(l) || eRotuloSolto(l)) break;
    juntas.push(l.replace(/\*/g, '').trim());
  }

  const debaixo = juntas.join('\n').replace(/^\n+|\n+$/g, '').trim();
  const marca = (naMarca ?? '').trim();

  // não veio nada por baixo: o texto era o que estava na marca
  if (!debaixo) return { texto: marca, proxima: j };

  // veio texto por baixo, e a marca trazia um nome curto — isso era o rótulo
  const rotulo = marca.length <= 40 && !/[.!?…:]$/.test(marca);
  return { texto: rotulo || !marca ? debaixo : `${marca}\n${debaixo}`, proxima: j };
}

/**
 * Os slides de um pedaço de texto que já se sabe ser um carrossel só.
 *
 * Serve o leitor daqui e serve a rota que recorta o que a Cát.IA marcou — é a
 * mesma leitura nos dois sítios, de propósito.
 */
export function slidesDoPedaco(linhas: string[]): string[] {
  const slides: string[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].trim();
    if (!l) continue;
    if (eSeparador(l)) continue;

    const marca = lerSlide(l);
    if (marca) {
      const { texto, proxima } = corpoDoSlide(linhas, i + 1, marca.texto);
      if (texto) slides.push(texto);
      i = proxima - 1;
      continue;
    }

    const corpo = corpoDeLista(l);
    if (corpo) {
      slides.push(corpo);
      continue;
    }
  }

  // nada marcado: cada linha com substância vale por um slide
  if (!slides.length) {
    return linhas
      .map((l) => l.trim().replace(/\*/g, '').trim())
      .filter((l) => l.length > 2 && !eSeparador(l));
  }
  return slides;
}

// ── o leitor dos documentos com marcas ───────────────────────────────────────

function porMarcas(linhas: string[]): EmObra[] {
  const saida: EmObra[] = [];
  let atual: EmObra | null = null;
  /** A última linha que podia ser um título, para quando a numeração recomeça. */
  let tituloEmEspera: string | null = null;
  /** Passou por uma linha de --- : o que vier a seguir é carrossel novo. */
  let cortado = false;

  /** Fecha o que estiver aberto e devolve um carrossel novo para o lugar dele. */
  const comecar = (titulo: string, porTitulo: boolean): EmObra => {
    if (atual && atual.slides.length) saida.push(atual);
    tituloEmEspera = null;
    cortado = false;
    return { titulo, slides: [], numeros: [], porTitulo };
  };

  /** Onde pôr o conteúdo que vem a seguir — abrindo um carrossel se for preciso. */
  const abrir = (): EmObra => {
    if (cortado && atual && atual.slides.length) return comecar(tituloEmEspera ?? SEM_NOME, false);
    cortado = false;
    if (atual) {
      tituloEmEspera = null;
      return atual;
    }
    return comecar(tituloEmEspera ?? SEM_NOME, false);
  };

  /** A próxima linha com substância, para as decisões que precisam de a ver. */
  const seguinte = (i: number) => {
    for (let j = i + 1; j < linhas.length; j++) {
      const l = linhas[j].trim();
      if (l) return l;
    }
    return '';
  };

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    if (eSeparador(linha)) {
      cortado = true;
      continue;
    }

    // 1. um título declarado manda sempre
    const titulo = lerTitulo(linha);
    if (titulo) {
      atual = comecar(titulo, true);
      continue;
    }

    // 2. um slide — e é aqui que se apanha o recomeço da numeração
    const slide = lerSlide(linha);
    if (slide) {
      if (slide.n === 1 && atual && atual.slides.length) {
        atual = comecar(tituloEmEspera ?? SEM_NOME, false);
      }
      atual = abrir();
      atual.numeros.push(slide.n);

      const { texto, proxima } = corpoDoSlide(linhas, i + 1, slide.texto);
      if (texto) atual.slides.push(texto);
      i = proxima - 1;
      continue;
    }

    // 3. listas — mas uma linha de lista seguida de um "Slide 1:" era o título
    const corpo = corpoDeLista(linha);
    if (corpo) {
      const proxima = lerSlide(seguinte(i));
      if (proxima?.n === 1) {
        tituloEmEspera = corpo;
        continue;
      }
      atual = abrir();
      atual.slides.push(corpo);
      continue;
    }

    // 4. não é nada disto: fica de parte, a ver se serve de título ao próximo
    if (podeSerTitulo(linha)) tituloEmEspera = linha.replace(/[*#]/g, '').trim();
  }
  if (atual && atual.slides.length) saida.push(atual);
  return saida;
}

/**
 * Cola outra vez os carrosséis que nunca deviam ter sido partidos.
 *
 * Um rótulo de secção pelo meio — "**Desenvolvimento**", "**A parte prática**"
 * — tem o mesmo feitio de um título de carrossel, e nenhuma expressão regular
 * os distingue. O que os distingue é a conta dos slides: se depois do rótulo
 * os slides continuam a contar (…3, 4, 5) em vez de recomeçarem em 1, então o
 * rótulo estava dentro do carrossel e não entre dois.
 */
function juntarFalsosCortes(lista: EmObra[]): EmObra[] {
  const saida: EmObra[] = [];
  for (const c of lista) {
    const anterior = saida[saida.length - 1];
    const primeiro = c.numeros[0];
    const ultimoAntes = anterior?.numeros[anterior.numeros.length - 1];
    const continua =
      c.porTitulo &&
      anterior !== undefined &&
      primeiro !== undefined &&
      ultimoAntes !== undefined &&
      primeiro === ultimoAntes + 1;

    if (continua) {
      anterior.slides.push(...c.slides);
      anterior.numeros.push(...c.numeros);
      continue;
    }
    saida.push(c);
  }
  return saida;
}

// ── o leitor dos documentos sem marcas nenhumas ──────────────────────────────

function limparLinha(l: string): string {
  return l
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-•*—–]\s+/, '')
    .replace(/^\d{1,3}[.)]\s+/, '')
    .replace(/\*/g, '')
    .trim();
}

/** Parte em blocos separados por linhas em branco. */
function emBlocos(linhas: string[]): string[][] {
  const blocos: string[][] = [];
  let bloco: string[] = [];
  for (const bruta of linhas) {
    const l = bruta.trim();
    if (!l) {
      if (bloco.length) blocos.push(bloco);
      bloco = [];
      continue;
    }
    bloco.push(l);
  }
  if (bloco.length) blocos.push(bloco);
  return blocos;
}

/**
 * Um documento só com títulos e parágrafos — o que sai de um PDF ou de um Word.
 *
 * Aqui não há "Slide 1:" nenhum para agarrar. O que separa os carrosséis são
 * as linhas de --- ; o que lhes dá nome é uma linha curta à cabeça de um
 * bloco. Sem nada disso, cada bloco vale por um slide.
 */
function porBlocosDeTexto(linhas: string[]): EmObra[] {
  // primeiro pelos separadores: são a fronteira mais forte que há
  const pedacos: string[][] = [[]];
  for (const bruta of linhas) {
    if (eSeparador(bruta.trim())) {
      pedacos.push([]);
      continue;
    }
    pedacos[pedacos.length - 1].push(bruta);
  }

  const saida: EmObra[] = [];
  const novo = (titulo: string): EmObra => {
    const c: EmObra = { titulo, slides: [], numeros: [], porTitulo: titulo !== SEM_NOME };
    saida.push(c);
    return c;
  };

  for (const pedaco of pedacos) {
    const blocos = emBlocos(pedaco);
    if (!blocos.length) continue;

    const comTitulo = blocos.some((b) => lerTitulo(b[0]) !== null);

    if (comTitulo) {
      let atual: EmObra | null = null;
      for (const bloco of blocos) {
        // Um bloco com um título lá dentro lê-se linha a linha: há documentos
        // — os que vêm do Word — que perderam as linhas em branco pelo
        // caminho, e trazem os três títulos e os nove slides todos seguidos.
        if (bloco.some((l) => lerTitulo(l) !== null)) {
          for (const l of bloco) {
            const titulo = lerTitulo(l);
            if (titulo) {
              atual = novo(titulo);
              continue;
            }
            if (!atual) atual = novo(SEM_NOME);
            atual.slides.push(limparLinha(l));
          }
          continue;
        }
        if (!atual) atual = novo(SEM_NOME);
        atual.slides.push(bloco.map(limparLinha).join('\n'));
      }
      continue;
    }

    // sem títulos: um carrossel por pedaço. Vários blocos, um slide cada; um
    // bloco só, cada linha vale por um slide.
    const c = novo(SEM_NOME);
    if (blocos.length > 1) {
      for (const bloco of blocos) c.slides.push(bloco.map(limparLinha).join('\n'));
    } else {
      for (const l of blocos[0]) c.slides.push(limparLinha(l));
    }
  }

  for (const c of saida) c.slides = c.slides.filter((s) => s.trim().length > 0);
  return saida.filter((c) => c.slides.length > 0);
}

// ── a porta de entrada ───────────────────────────────────────────────────────

export function extrairDoTexto(texto: string): CarrosselLido[] {
  const cru = String(texto).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const linhas = cru.split('\n');

  // Que feitio de documento é este? Se traz marcas de slide ou listas, lê-se
  // linha a linha; se não traz marca nenhuma, lê-se por blocos.
  const temMarcas = linhas.some((l) => {
    const t = l.trim();
    return Boolean(lerSlide(t) || corpoDeLista(t));
  });

  const achados = (temMarcas ? juntarFalsosCortes(porMarcas(linhas)) : porBlocosDeTexto(linhas))
    .filter((c) => c.slides.length > 0);

  // um texto curto que dá um slide só não é um carrossel — é uma frase
  const total = achados.reduce((a, c) => a + c.slides.length, 0);
  if (total <= 1 && cru.trim().length < 120) return [];

  const saida: CarrosselLido[] = achados.map((c) => ({ titulo: c.titulo, slides: c.slides }));

  // os que ficaram sem nome levam um número, por ordem de aparição
  const varios = saida.length > 1;
  saida.forEach((c, i) => {
    if (c.titulo === SEM_NOME) c.titulo = varios ? `Carrossel ${i + 1}` : 'Carrossel';
  });

  // nada reconhecido: cada parágrafo passa a ser um slide
  if (!saida.length) {
    const paragrafos = cru
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p && !eSeparador(p));
    if (paragrafos.length > 1) saida.push({ titulo: 'Carrossel', slides: paragrafos });
  }

  return saida;
}
