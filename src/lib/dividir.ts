import type { TemplateSpec } from './types';

/**
 * Lê um documento e propõe quantos carrosséis lá cabem.
 *
 * A lógica: cada slide tem um espaço fixo (as caixas do template). Um carrossel
 * tem N slides. Logo, um carrossel absorve uma quantidade de texto conhecida —
 * e o documento dá para tantos carrosséis quantos essa conta permitir.
 * Onde houver títulos, corta-se por títulos; senão, por parágrafos.
 */

export interface CarrosselProposto {
  titulo: string;
  texto: string;
  caracteres: number;
}

/** Quanto texto absorve um carrossel inteiro, com este template. */
export function capacidade(spec: TemplateSpec, slidesPorCarrossel: number) {
  const porSlide = spec.boxes
    .filter((b) => !b.fixed)
    .reduce((total, b) => total + (b.maxChars ?? 120), 0);
  return Math.max(200, porSlide * slidesPorCarrossel);
}

/** Uma linha curta, sem pontuação final, é provavelmente um título. */
function ehTitulo(linha: string) {
  const t = linha.trim();
  if (!t || t.length > 90) return false;
  if (/^(#{1,6}|\d+[.)]\s)/.test(t)) return true;
  return !/[.!?;:,]$/.test(t) && t.split(/\s+/).length <= 12 && /[A-ZÁÉÍÓÚÂÊÔÃÕÀÇ]/.test(t[0]);
}

function primeiraLinha(bloco: string) {
  const linha = bloco.split('\n').map((l) => l.trim()).find(Boolean) ?? 'Carrossel';
  return linha.replace(/^#{1,6}\s*/, '').replace(/^\d+[.)]\s*/, '').slice(0, 70);
}

/**
 * Corta o documento em secções: por títulos se houver, senão por parágrafos.
 * Diz também por qual dos dois foi — porque quando o autor já dividiu o
 * documento, essa divisão manda, e não se juntam duas secções numa só.
 */
function seccoes(texto: string): { blocos: string[]; porTitulos: boolean } {
  const linhas = texto.split('\n');
  const titulos = linhas.filter(ehTitulo).length;

  // com títulos a sério, o documento já vem dividido pelo autor
  if (titulos >= 2 && titulos <= linhas.length / 3) {
    const blocos: string[] = [];
    let atual: string[] = [];
    for (const linha of linhas) {
      if (ehTitulo(linha) && atual.some((l) => l.trim())) {
        blocos.push(atual.join('\n').trim());
        atual = [];
      }
      atual.push(linha);
    }
    if (atual.some((l) => l.trim())) blocos.push(atual.join('\n').trim());
    return { blocos: blocos.filter((b) => b.length > 60), porTitulos: true };
  }

  return {
    blocos: texto.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 40),
    porTitulos: false,
  };
}

export function propor(args: {
  texto: string;
  spec: TemplateSpec;
  slidesPorCarrossel: number;
  /** limite de segurança, para um PDF de 500 páginas não rebentar com tudo */
  maximo?: number;
}): CarrosselProposto[] {
  const { texto, spec, slidesPorCarrossel, maximo = 120 } = args;
  const limpo = texto.trim();
  if (!limpo) return [];

  const cabe = capacidade(spec, slidesPorCarrossel);
  const { blocos, porTitulos } = seccoes(limpo);
  if (!blocos.length) {
    return [{ titulo: primeiraLinha(limpo), texto: limpo, caracteres: limpo.length }];
  }

  const propostos: CarrosselProposto[] = [];

  /**
   * Documento já dividido por títulos: cada secção é um carrossel, e ponto.
   * Juntar duas porque "cabiam" no mesmo era desfazer o trabalho de quem
   * escreveu — um documento com 60 carrosséis tem de dar 60.
   */
  if (porTitulos) {
    for (const bloco of blocos) {
      if (bloco.length > cabe * 2.2) {
        // uma secção enorme parte-se, mas só essa
        const paragrafos = bloco.split(/\n{2,}/);
        let pedaco: string[] = [];
        let n = 0;
        for (const par of paragrafos) {
          if (n + par.length > cabe && pedaco.length) {
            const t = pedaco.join('\n\n');
            propostos.push({ titulo: primeiraLinha(t), texto: t, caracteres: t.length });
            pedaco = [];
            n = 0;
          }
          pedaco.push(par);
          n += par.length;
        }
        if (pedaco.length) {
          const t = pedaco.join('\n\n');
          propostos.push({ titulo: primeiraLinha(t), texto: t, caracteres: t.length });
        }
      } else {
        propostos.push({
          titulo: primeiraLinha(bloco),
          texto: bloco,
          caracteres: bloco.length,
        });
      }
    }
    return propostos.slice(0, maximo);
  }

  // sem títulos: juntam-se parágrafos até encherem um carrossel
  let acumulado: string[] = [];
  let tamanho = 0;

  const fechar = () => {
    if (!acumulado.length) return;
    const t = acumulado.join('\n\n');
    propostos.push({ titulo: primeiraLinha(t), texto: t, caracteres: t.length });
    acumulado = [];
    tamanho = 0;
  };

  for (const bloco of blocos) {
    if (bloco.length > cabe * 1.6) {
      fechar();
      // bloco enorme: parte-o em pedaços do tamanho de um carrossel
      const paragrafos = bloco.split(/\n{2,}/);
      let pedaco: string[] = [];
      let n = 0;
      for (const par of paragrafos) {
        if (n + par.length > cabe && pedaco.length) {
          const t = pedaco.join('\n\n');
          propostos.push({ titulo: primeiraLinha(t), texto: t, caracteres: t.length });
          pedaco = [];
          n = 0;
        }
        pedaco.push(par);
        n += par.length;
      }
      if (pedaco.length) {
        const t = pedaco.join('\n\n');
        propostos.push({ titulo: primeiraLinha(t), texto: t, caracteres: t.length });
      }
      continue;
    }

    if (tamanho + bloco.length > cabe && acumulado.length) fechar();
    acumulado.push(bloco);
    tamanho += bloco.length;
  }
  fechar();

  return propostos.slice(0, maximo);
}
