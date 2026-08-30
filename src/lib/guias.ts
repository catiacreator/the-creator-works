/**
 * O guia de cada página: três a quatro linhas a dizer ao que ela vem.
 *
 * Vive tudo num sítio só de propósito — assim quando uma página muda, o que
 * ela promete muda no mesmo ficheiro, e não fica um texto velho perdido num
 * componente qualquer.
 */

export interface Guia {
  titulo: string;
  passos: string[];
}

export const GUIAS: Record<string, Guia> = {
  '/': {
    titulo: 'Como funciona a app',
    passos: [
      'Preenche o Sobre mim — é o que a Cát.IA lê antes de escrever seja o que for.',
      'Carrega as tuas fotografias e desenha um template no editor.',
      'Depois é só criar: por conversa, por documento, ou a partir de uma notícia.',
    ],
  },
  '/criar': {
    titulo: 'Como funciona esta página',
    passos: [
      'Escolhe o tipo: Reels, Carrossel ou Stories.',
      'Escolhe o objetivo e o formato — cada formato tem o (i) a dizer como se escreve.',
      'Carregas em Gerar e abre a conversa, onde a Cát.IA pergunta o tema e escreve.',
    ],
  },
  '/criar-carrosseis': {
    titulo: 'Como funciona esta página',
    passos: [
      'Cola o texto ou carrega um PDF, Word ou Excel — a app diz quantos carrosséis lá estão.',
      'Escolhe quais levas. Abre cada um para corrigir o texto, mudar a ordem ou apagar slides.',
      'Dá aspeto a cada carrossel — estilo e fotografia, uma para todos os slides ou uma a uma.',
      'No fim descarregas em 4K, um a um ou todos, ou guardas na biblioteca.',
    ],
  },
  '/editor': {
    titulo: 'Como funciona o editor',
    passos: [
      'Desenha um slide como queres que fiquem todos: fundo, texto, fotografia.',
      'Guarda como template — passa a ser o que a app usa para compor os carrosséis.',
      'Podes abrir um carrossel já feito e mexer nele slide a slide.',
    ],
  },
  '/carrosseis': {
    titulo: 'Como funciona esta página',
    passos: [
      'Estão aqui todos os carrosséis que fizeste, do mais recente para trás.',
      'Passa o rato por cima de um para o abrir no editor, descarregar ou apagar.',
      'Podes escolher vários com as caixas e apagá-los de uma vez.',
    ],
  },
  '/carrosseis/': {
    titulo: 'Como funciona esta página',
    passos: [
      'Vês o carrossel slide a slide, como vai sair.',
      'Descarrega em PNG ou em .pptx, que abre no Canva já editável.',
      'Trocar a fotografia volta a compor os slides todos com a nova.',
    ],
  },
  '/biblioteca': {
    titulo: 'O que está aqui',
    passos: [
      'Tudo o que já é teu: carrosséis, templates, fotografias e materiais.',
      'Os materiais são os documentos de que a Cát.IA se alimenta quando escreve.',
    ],
  },
  '/templates': {
    titulo: 'Como funcionam os templates',
    passos: [
      'Um template é o desenho que a app usa para compor os slides.',
      'Desenha-o uma vez no editor e todos os carrosséis saem com a tua cara.',
      'Podes ter vários e escolher qual usar em cada carrossel.',
    ],
  },
  '/fotografias': {
    titulo: 'Como funciona esta página',
    passos: [
      'Carrega aqui as tuas fotografias — são estas que entram nos carrosséis.',
      'Organiza-as por pastas e dá-lhes nomes que te digam alguma coisa.',
      'A app nunca inventa imagens: as que aparecem nos carrosséis são as tuas.',
    ],
  },
  '/material': {
    titulo: 'Como funciona esta página',
    passos: [
      'Carrega PDFs, Word ou texto colado — aulas, notas, perguntas do direct.',
      'A Cát.IA lê o que estiver aqui antes de escrever, e usa os teus exemplos.',
      'Quanto mais concreto for o material, menos genérico sai o conteúdo.',
    ],
  },
  '/chat': {
    titulo: 'Como funciona a Cát.IA',
    passos: [
      'Pede-lhe um carrossel, um Reels ou uma sequência de stories.',
      'Ela conhece o teu Sobre mim e o teu material, e escreve pelo teu método.',
      'Quando escrever um carrossel, aparece o botão para o abrir no editor.',
    ],
  },
  '/ultima-hora': {
    titulo: 'Como funciona esta página',
    passos: [
      'Carrega em Procurar e a app vai à internet ver o que está a dar que falar.',
      'Cada assunto vem com dois ângulos: um de história, outro de lista.',
      'Escolhes um ângulo, escolhes o gancho entre nove, e o carrossel sai dali.',
    ],
  },
  '/analise': {
    titulo: 'Como funciona esta página',
    passos: [
      'Cola o que está no teu perfil: nome, bio, destaques.',
      'A Cát.IA cruza-o com o teu Sobre mim e devolve o diagnóstico em seis blocos.',
      'Guarda as análises para comparares daqui a um mês.',
    ],
  },
  '/perfil': {
    titulo: 'Como funciona esta página',
    passos: [
      'São vinte e uma perguntas sobre ti, o teu público e a tua oferta.',
      'É o que a Cát.IA lê antes de escrever — o que responderes aqui aparece lá.',
      'Não tens de responder a tudo de uma vez; guarda sozinho à medida que escreves.',
    ],
  },
  '/definicoes': {
    titulo: 'Como funciona esta página',
    passos: [
      'A voz da marca é como queres que a app escreva por ti.',
      'Entra em tudo: carrosséis, roteiros e respostas da Cát.IA.',
    ],
  },
};

/** O guia desta rota, apanhando também as páginas de detalhe. */
export function guiaDe(caminho: string): Guia | null {
  if (GUIAS[caminho]) return GUIAS[caminho];
  // /carrosseis/<id> e afins
  const pai = Object.keys(GUIAS).find((k) => k.endsWith('/') && caminho.startsWith(k));
  return pai ? GUIAS[pai] : null;
}
