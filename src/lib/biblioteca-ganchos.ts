/**
 * A biblioteca de ganchos.
 *
 * Cem aberturas prontas, arrumadas por sentimento. Não são frases para copiar
 * como estão: os [colchetes] são para trocar pelo que é teu — o nicho, o
 * público, o número. O gancho dá a forma; a substância é sempre tua.
 *
 * É outra coisa do que o `ganchos.ts` ao lado: lá, a Cát.IA escreve ganchos
 * de raiz para um tema; aqui está uma lista fixa, igual para toda a gente,
 * para quando o ecrã está em branco e não apetece esperar por ninguém.
 */

export interface GanchoDaBiblioteca {
  categoria: string;
  texto: string;
}

export const CATEGORIAS_DE_GANCHOS = ['Todos', 'Recado direto', 'Posicionamento', 'Atalho e clareza', 'Prova e autoridade', 'Alerta', 'Transformação', 'Quebra de crença', 'Listas e aceleração', 'Identidade e pertença', 'Experiência e conversa'];

export const BIBLIOTECA_DE_GANCHOS: GanchoDaBiblioteca[] = [
  // RECADO DIRETO
  { categoria: 'Recado direto', texto: 'Não sei quem precisa de ouvir isto mas: [verdade do teu nicho]' },
  { categoria: 'Recado direto', texto: 'Ninguém te vai dizer isto, por isso serei eu: [verdade incómoda do nicho]' },
  { categoria: 'Recado direto', texto: 'Para de [comportamento limitante] — já. Aqui está o porquê.' },
  { categoria: 'Recado direto', texto: 'O que ninguém na tua área quer que saibas sobre [tema]' },
  { categoria: 'Recado direto', texto: 'Lembrete que ninguém pediu mas toda a gente precisa: [insight do nicho]' },
  { categoria: 'Recado direto', texto: 'Se és [perfil do público], isto é para ti.' },
  { categoria: 'Recado direto', texto: 'Aviso rápido para quem está a [situação comum do nicho].' },
  { categoria: 'Recado direto', texto: 'Diz-me se isto ressoa: [situação real do público]' },
  { categoria: 'Recado direto', texto: 'Recebi uma mensagem que me fez parar. Era sobre [tema do nicho].' },
  { categoria: 'Recado direto', texto: 'Isto pode ser difícil de ouvir, mas [verdade que liberta]' },

  // POSICIONAMENTO
  { categoria: 'Posicionamento', texto: 'Opiniões que defendo até ao fim como [profissão / papel / estilo de vida]' },
  { categoria: 'Posicionamento', texto: 'O que aprendi a fazer diferente depois de [X anos / experiência marcante]' },
  { categoria: 'Posicionamento', texto: 'A minha abordagem a [tema] é diferente — e vou explicar porquê.' },
  { categoria: 'Posicionamento', texto: 'Discordo de [crença comum no nicho]. E tens aqui os meus motivos.' },
  { categoria: 'Posicionamento', texto: 'Sou [profissão] há [X anos] e mudei completamente a minha visão sobre [tema]' },
  { categoria: 'Posicionamento', texto: 'O que faço de forma diferente de qualquer outro [profissional do nicho]' },
  { categoria: 'Posicionamento', texto: 'Há uma coisa que recuso-me a fazer como [profissão]: [prática comum]' },
  { categoria: 'Posicionamento', texto: 'Isto é o que defendo mesmo quando ninguém concorda: [opinião forte]' },
  { categoria: 'Posicionamento', texto: 'A verdade incómoda sobre [tema] que poucos profissionais admitem' },
  { categoria: 'Posicionamento', texto: 'Sou [profissão] e ninguém acredita quando digo que: [opinião impopular]' },

  // ATALHO E CLAREZA
  { categoria: 'Atalho e clareza', texto: 'Se eu tivesse de [alcançar resultado / resolver problema], isto é exatamente o que eu faria.' },
  { categoria: 'Atalho e clareza', texto: 'Toda a gente fala sobre [tema], mas ninguém te explica como. Então hoje vou mostrar-te.' },
  { categoria: 'Atalho e clareza', texto: 'Existe uma forma mais simples de [resultado], mas quase ninguém faz isto.' },
  { categoria: 'Atalho e clareza', texto: 'Se eu tivesse só [X tempo] para [objetivo], eu fazia isto aqui.' },
  { categoria: 'Atalho e clareza', texto: 'Para de complicar [tema]. Aqui está o que realmente funciona.' },
  { categoria: 'Atalho e clareza', texto: 'O atalho que ninguém te ensinou para [resultado desejado]' },
  { categoria: 'Atalho e clareza', texto: 'Não perco horas [a fazer X] porque existe uma forma muito mais simples de [resultado].' },
  { categoria: 'Atalho e clareza', texto: 'Em [X minutos] consegues [resultado que parecia difícil]. Vou mostrar-te.' },
  { categoria: 'Atalho e clareza', texto: 'A coisa mais simples que podes fazer hoje para [resultado]: [ação direta]' },
  { categoria: 'Atalho e clareza', texto: 'Esquece tudo o que te disseram sobre [tema]. Aqui está o que funciona de verdade.' },

  // PROVA E AUTORIDADE
  { categoria: 'Prova e autoridade', texto: '[Resultado / prova visível] é a prova de que [ação / método] funciona em [X tempo].' },
  { categoria: 'Prova e autoridade', texto: 'Sou [profissão] há [tempo] e ninguém acredita quando digo que:' },
  { categoria: 'Prova e autoridade', texto: 'Fiz [X ação] durante [X tempo] e o resultado surpreendeu-me.' },
  { categoria: 'Prova e autoridade', texto: '[X] coisas que aprendi depois de [tempo / experiência marcante] a trabalhar com [nicho]' },
  { categoria: 'Prova e autoridade', texto: 'Depois de [resultado alcançado], percebi que tudo começa por [insight]' },
  { categoria: 'Prova e autoridade', texto: '[X] perguntas que me fazem todos os dias — e as respostas honestas.' },
  { categoria: 'Prova e autoridade', texto: 'Já ajudei [X pessoas] com [problema] e o padrão é sempre o mesmo:' },
  { categoria: 'Prova e autoridade', texto: 'O erro que vejo repetir-se em [X% das pessoas / quase toda a gente] que [situação]' },
  { categoria: 'Prova e autoridade', texto: '[Número] podcasts / livros / filmes que te vão ensinar mais do que [alternativa comum].' },
  { categoria: 'Prova e autoridade', texto: '[X] coisas que são melhores do que [alternativa comum] para [resultado desejado].' },

  // ALERTA
  { categoria: 'Alerta', texto: 'Sou [profissão] e aviso-te: cada vez mais [situação preocupante].' },
  { categoria: 'Alerta', texto: 'Sou [profissão ou área] e neste [momento atual] aviso-te: [aviso importante].' },
  { categoria: 'Alerta', texto: 'Se estás a fazer [ação comum], precisas de ver isto.' },
  { categoria: 'Alerta', texto: 'Cuidado com [prática comum do nicho]. Aqui está o que ninguém te conta.' },
  { categoria: 'Alerta', texto: 'Isto pode estar a sabotar o teu [resultado] sem perceberes.' },
  { categoria: 'Alerta', texto: '[X] sinais de que já está na hora de [mudança importante]' },
  { categoria: 'Alerta', texto: 'Para antes que [consequência negativa]. Aqui está o que fazer.' },
  { categoria: 'Alerta', texto: 'Antes de [ação comum do nicho], vê isto. Pode poupar-te [consequência negativa].' },
  { categoria: 'Alerta', texto: 'O erro silencioso que quase toda a gente comete com [tema]' },
  { categoria: 'Alerta', texto: 'Isto está a acontecer mais do que deveria: [situação preocupante do nicho]' },

  // TRANSFORMAÇÃO
  { categoria: 'Transformação', texto: 'Eu [ação ou decisão que tomaste] e isso mudou completamente [área da vida ou resultado].' },
  { categoria: 'Transformação', texto: '«Pareces mais feliz.» Obrigada, parei de ___ e agora ___.' },
  { categoria: 'Transformação', texto: 'Há [X tempo] não conseguia [situação difícil]. Hoje [resultado alcançado]. O que mudou:' },
  { categoria: 'Transformação', texto: 'A decisão que parecia pequena mas mudou tudo: [decisão]' },
  { categoria: 'Transformação', texto: 'Não foi [coisa óbvia] que me transformou. Foi [coisa inesperada].' },
  { categoria: 'Transformação', texto: 'O momento em que percebi que estava a fazer tudo errado em relação a [tema]:' },
  { categoria: 'Transformação', texto: 'Antes: [situação difícil]. Agora: [resultado]. A diferença foi [ação simples].' },
  { categoria: 'Transformação', texto: 'Se isto ressoa contigo, pode estar na hora de [mudança importante]' },
  { categoria: 'Transformação', texto: 'Parei de [comportamento limitante] há [X tempo] e nunca mais olhei para trás.' },
  { categoria: 'Transformação', texto: 'O que muda quando decides parar de [crença ou comportamento limitante]:' },

  // QUEBRA DE CRENÇA
  { categoria: 'Quebra de crença', texto: 'Não precisas de [recurso comum / crença limitante] para ter [resultado desejado].' },
  { categoria: 'Quebra de crença', texto: 'Deves achar que [ação simples] parece simples demais, mas foi exatamente isso que eu fiz para [resultado].' },
  { categoria: 'Quebra de crença', texto: 'Toda a gente diz que [afirmação comum], mas a verdade é que [contraponto real].' },
  { categoria: 'Quebra de crença', texto: 'Não precisas de [o que a maioria acredita ser necessário]. Precisas de [o que realmente gera resultado].' },
  { categoria: 'Quebra de crença', texto: 'Estás a complicar algo que deveria ser simples: [tema].' },
  { categoria: 'Quebra de crença', texto: 'A mentira que [nicho/área] te conta sobre [tema]:' },
  { categoria: 'Quebra de crença', texto: 'O que acreditei durante anos sobre [tema] — e porque estava errada.' },
  { categoria: 'Quebra de crença', texto: '[X] mitos sobre [tema do nicho] que precisam de acabar hoje.' },
  { categoria: 'Quebra de crença', texto: 'Ninguém precisa de [crença comum] para [resultado]. Aqui está a prova.' },
  { categoria: 'Quebra de crença', texto: 'A razão pela qual [estratégia comum] não funciona — e o que fazer em vez disso.' },

  // LISTAS E ACELERAÇÃO
  { categoria: 'Listas e aceleração', texto: '[Número] coisas que te fazem [resultado desejado] mais rápido em menos tempo.' },
  { categoria: 'Listas e aceleração', texto: 'X [tipo de coisa] que me ajudaram a [resultado específico].' },
  { categoria: 'Listas e aceleração', texto: '[Número] [ação necessária] para conquistares o teu tão sonhado [resultado].' },
  { categoria: 'Listas e aceleração', texto: '[X] hábitos simples que mudaram completamente o meu [área de vida / trabalho]' },
  { categoria: 'Listas e aceleração', texto: '[X] perguntas para te fazeres antes de [decisão importante do nicho]' },
  { categoria: 'Listas e aceleração', texto: '[X] razões pelas quais ainda não conseguiste [resultado desejado]' },
  { categoria: 'Listas e aceleração', texto: '[X] coisas que ninguém te conta sobre [tema] mas que fazem toda a diferença' },
  { categoria: 'Listas e aceleração', texto: '[X] sinais de que já estás pronta para [próximo passo]' },
  { categoria: 'Listas e aceleração', texto: '[X] substituições simples que mudam tudo em [área do nicho]' },
  { categoria: 'Listas e aceleração', texto: '[X] erros que cometi em [área] — e como os evitar.' },

  // IDENTIDADE E PERTENÇA
  { categoria: 'Identidade e pertença', texto: 'Se andares muito comigo vais acabar ___.' },
  { categoria: 'Identidade e pertença', texto: 'Querido algoritmo, mostra este vídeo a [perfil específico] nascidas entre [ano] e [ano].' },
  { categoria: 'Identidade e pertença', texto: 'Isto é para quem está farto de [situação limitante] e quer [resultado].' },
  { categoria: 'Identidade e pertença', texto: 'Se te identificas com [perfil / situação], este conteúdo é 100% para ti.' },
  { categoria: 'Identidade e pertença', texto: 'Existe um tipo de pessoa que consegue [resultado] com facilidade. Reconheces-te?' },
  { categoria: 'Identidade e pertença', texto: 'O que separa quem [resultado positivo] de quem [resultado negativo]:' },
  { categoria: 'Identidade e pertença', texto: 'Para as que já chegaram a [situação específica] e querem [próximo nível]:' },
  { categoria: 'Identidade e pertença', texto: 'Avisa o teu [relação próxima] que precisa de ver isto sobre [tema].' },
  { categoria: 'Identidade e pertença', texto: 'Se [situação específica], provavelmente também [consequência comum]. Aqui está o porquê.' },
  { categoria: 'Identidade e pertença', texto: 'Crescer comigo significa [transformação específica]. Estás pronta?' },

  // EXPERIÊNCIA E CONVERSA
  { categoria: 'Experiência e conversa', texto: 'Se já ultrapassaste [desafio], deixa aqui o que ninguém te contou.' },
  { categoria: 'Experiência e conversa', texto: 'Se fores 100% honesta contigo mesma... [pergunta direta do nicho]?' },
  { categoria: 'Experiência e conversa', texto: 'Faz-me uma pergunta sobre [tema] nos comentários. Respondo a todas.' },
  { categoria: 'Experiência e conversa', texto: 'Conta-me: qual é o teu maior obstáculo com [tema do nicho]?' },
  { categoria: 'Experiência e conversa', texto: 'Posso perguntar-te algo? O que é que ainda não fizeste em relação a [tema]?' },
  { categoria: 'Experiência e conversa', texto: 'Qual foi o momento em que percebeste que precisavas de mudar [algo no nicho]?' },
  { categoria: 'Experiência e conversa', texto: 'Diz-me nos comentários: em que fase estás com [jornada do nicho]?' },
  { categoria: 'Experiência e conversa', texto: 'O que gostarias de ter sabido mais cedo sobre [tema]? Começo eu:' },
  { categoria: 'Experiência e conversa', texto: 'Que conselho darias ao teu eu de [X anos atrás] sobre [tema]?' },
  { categoria: 'Experiência e conversa', texto: 'Completa a frase: quando penso em [tema], o que me trava é ___.' },
];

/** Os que servem para esta categoria e esta pesquisa. */
export function filtrarGanchos(categoria: string, procura: string): GanchoDaBiblioteca[] {
  const q = procura.trim().toLowerCase();
  return BIBLIOTECA_DE_GANCHOS.filter((g) => {
    const daCategoria = categoria === 'Todos' || g.categoria === categoria;
    const daProcura =
      !q || g.texto.toLowerCase().includes(q) || g.categoria.toLowerCase().includes(q);
    return daCategoria && daProcura;
  });
}
