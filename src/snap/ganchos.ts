/**
 * Os ganchos do CarouselSnap.
 *
 * Trazidos tal e qual do `src/data/hooks.ts` do Snap — os mesmos cem, as
 * mesmas categorias, a mesma ordem. Não são tocados: são da Cátia, e o que
 * vem para aqui vem como está.
 *
 * Vive em `src/snap/` e não em `src/lib/` de propósito. O Snap é uma app
 * inteira a mudar-se para dentro desta, e misturá-lo com o que já cá estava
 * — mesmo quando o conteúdo é igual — faz uma terceira coisa que não é nem
 * um nem outro. Aqui os dois vivem lado a lado, cada um com o seu.
 *
 * (O `src/lib/biblioteca-ganchos.ts` tem esta mesma lista, escrita noutro
 * formato, e continua a servir o que já a usava do lado do Creator Works.)
 */

export interface Hook {
  cat: string;
  text: string;
}

export const GANCHOS: Hook[] = [
  // RECADO DIRETO (10)
  { cat: "Recado direto", text: "Não sei quem precisa de ouvir isto mas: [verdade do teu nicho]" },
  { cat: "Recado direto", text: "Ninguém te vai dizer isto, por isso serei eu: [verdade incómoda do nicho]" },
  { cat: "Recado direto", text: "Para de [comportamento limitante] — já. Aqui está o porquê." },
  { cat: "Recado direto", text: "O que ninguém na tua área quer que saibas sobre [tema]" },
  { cat: "Recado direto", text: "Lembrete que ninguém pediu mas toda a gente precisa: [insight do nicho]" },
  { cat: "Recado direto", text: "Se és [perfil do público], isto é para ti." },
  { cat: "Recado direto", text: "Aviso rápido para quem está a [situação comum do nicho]." },
  { cat: "Recado direto", text: "Diz-me se isto ressoa: [situação real do público]" },
  { cat: "Recado direto", text: "Recebi uma mensagem que me fez parar. Era sobre [tema do nicho]." },
  { cat: "Recado direto", text: "Isto pode ser difícil de ouvir, mas [verdade que liberta]" },

  // POSICIONAMENTO (10)
  { cat: "Posicionamento", text: "Opiniões que defendo até ao fim como [profissão / papel / estilo de vida]" },
  { cat: "Posicionamento", text: "O que aprendi a fazer diferente depois de [X anos / experiência marcante]" },
  { cat: "Posicionamento", text: "A minha abordagem a [tema] é diferente — e vou explicar porquê." },
  { cat: "Posicionamento", text: "Discordo de [crença comum no nicho]. E tens aqui os meus motivos." },
  { cat: "Posicionamento", text: "Sou [profissão] há [X anos] e mudei completamente a minha visão sobre [tema]" },
  { cat: "Posicionamento", text: "O que faço de forma diferente de qualquer outro [profissional do nicho]" },
  { cat: "Posicionamento", text: "Há uma coisa que recuso-me a fazer como [profissão]: [prática comum]" },
  { cat: "Posicionamento", text: "Isto é o que defendo mesmo quando ninguém concorda: [opinião forte]" },
  { cat: "Posicionamento", text: "A verdade incómoda sobre [tema] que poucos profissionais admitem" },
  { cat: "Posicionamento", text: "Sou [profissão] e ninguém acredita quando digo que: [opinião impopular]" },

  // ATALHO E CLAREZA (10)
  { cat: "Atalho e clareza", text: "Se eu tivesse de [alcançar resultado / resolver problema], isto é exatamente o que eu faria." },
  { cat: "Atalho e clareza", text: "Toda a gente fala sobre [tema], mas ninguém te explica como. Então hoje vou mostrar-te." },
  { cat: "Atalho e clareza", text: "Existe uma forma mais simples de [resultado], mas quase ninguém faz isto." },
  { cat: "Atalho e clareza", text: "Se eu tivesse só [X tempo] para [objetivo], eu fazia isto aqui." },
  { cat: "Atalho e clareza", text: "Para de complicar [tema]. Aqui está o que realmente funciona." },
  { cat: "Atalho e clareza", text: "O atalho que ninguém te ensinou para [resultado desejado]" },
  { cat: "Atalho e clareza", text: "Não perco horas [a fazer X] porque existe uma forma muito mais simples de [resultado]." },
  { cat: "Atalho e clareza", text: "Em [X minutos] consegues [resultado que parecia difícil]. Vou mostrar-te." },
  { cat: "Atalho e clareza", text: "A coisa mais simples que podes fazer hoje para [resultado]: [ação direta]" },
  { cat: "Atalho e clareza", text: "Esquece tudo o que te disseram sobre [tema]. Aqui está o que funciona de verdade." },

  // PROVA E AUTORIDADE (10)
  { cat: "Prova e autoridade", text: "[Resultado / prova visível] é a prova de que [ação / método] funciona em [X tempo]." },
  { cat: "Prova e autoridade", text: "Sou [profissão] há [tempo] e ninguém acredita quando digo que:" },
  { cat: "Prova e autoridade", text: "Fiz [X ação] durante [X tempo] e o resultado surpreendeu-me." },
  { cat: "Prova e autoridade", text: "[X] coisas que aprendi depois de [tempo / experiência marcante] a trabalhar com [nicho]" },
  { cat: "Prova e autoridade", text: "Depois de [resultado alcançado], percebi que tudo começa por [insight]" },
  { cat: "Prova e autoridade", text: "[X] perguntas que me fazem todos os dias — e as respostas honestas." },
  { cat: "Prova e autoridade", text: "Já ajudei [X pessoas] com [problema] e o padrão é sempre o mesmo:" },
  { cat: "Prova e autoridade", text: "O erro que vejo repetir-se em [X% das pessoas / quase toda a gente] que [situação]" },
  { cat: "Prova e autoridade", text: "[Número] podcasts / livros / filmes que te vão ensinar mais do que [alternativa comum]." },
  { cat: "Prova e autoridade", text: "[X] coisas que são melhores do que [alternativa comum] para [resultado desejado]." },

  // ALERTA (10)
  { cat: "Alerta", text: "Sou [profissão] e aviso-te: cada vez mais [situação preocupante]." },
  { cat: "Alerta", text: "Sou [profissão ou área] e neste [momento atual] aviso-te: [aviso importante]." },
  { cat: "Alerta", text: "Se estás a fazer [ação comum], precisas de ver isto." },
  { cat: "Alerta", text: "Cuidado com [prática comum do nicho]. Aqui está o que ninguém te conta." },
  { cat: "Alerta", text: "Isto pode estar a sabotar o teu [resultado] sem perceberes." },
  { cat: "Alerta", text: "[X] sinais de que já está na hora de [mudança importante]" },
  { cat: "Alerta", text: "Para antes que [consequência negativa]. Aqui está o que fazer." },
  { cat: "Alerta", text: "Antes de [ação comum do nicho], vê isto. Pode poupar-te [consequência negativa]." },
  { cat: "Alerta", text: "O erro silencioso que quase toda a gente comete com [tema]" },
  { cat: "Alerta", text: "Isto está a acontecer mais do que deveria: [situação preocupante do nicho]" },

  // TRANSFORMAÇÃO (10)
  { cat: "Transformação", text: "Eu [ação ou decisão que tomaste] e isso mudou completamente [área da vida ou resultado]." },
  { cat: "Transformação", text: "«Pareces mais feliz.» Obrigada, parei de ___ e agora ___." },
  { cat: "Transformação", text: "Há [X tempo] não conseguia [situação difícil]. Hoje [resultado alcançado]. O que mudou:" },
  { cat: "Transformação", text: "A decisão que parecia pequena mas mudou tudo: [decisão]" },
  { cat: "Transformação", text: "Não foi [coisa óbvia] que me transformou. Foi [coisa inesperada]." },
  { cat: "Transformação", text: "O momento em que percebi que estava a fazer tudo errado em relação a [tema]:" },
  { cat: "Transformação", text: "Antes: [situação difícil]. Agora: [resultado]. A diferença foi [ação simples]." },
  { cat: "Transformação", text: "Se isto ressoa contigo, pode estar na hora de [mudança importante]" },
  { cat: "Transformação", text: "Parei de [comportamento limitante] há [X tempo] e nunca mais olhei para trás." },
  { cat: "Transformação", text: "O que muda quando decides parar de [crença ou comportamento limitante]:" },

  // QUEBRA DE CRENÇA (10)
  { cat: "Quebra de crença", text: "Não precisas de [recurso comum / crença limitante] para ter [resultado desejado]." },
  { cat: "Quebra de crença", text: "Deves achar que [ação simples] parece simples demais, mas foi exatamente isso que eu fiz para [resultado]." },
  { cat: "Quebra de crença", text: "Toda a gente diz que [afirmação comum], mas a verdade é que [contraponto real]." },
  { cat: "Quebra de crença", text: "Não precisas de [o que a maioria acredita ser necessário]. Precisas de [o que realmente gera resultado]." },
  { cat: "Quebra de crença", text: "Estás a complicar algo que deveria ser simples: [tema]." },
  { cat: "Quebra de crença", text: "A mentira que [nicho/área] te conta sobre [tema]:" },
  { cat: "Quebra de crença", text: "O que acreditei durante anos sobre [tema] — e porque estava errada." },
  { cat: "Quebra de crença", text: "[X] mitos sobre [tema do nicho] que precisam de acabar hoje." },
  { cat: "Quebra de crença", text: "Ninguém precisa de [crença comum] para [resultado]. Aqui está a prova." },
  { cat: "Quebra de crença", text: "A razão pela qual [estratégia comum] não funciona — e o que fazer em vez disso." },

  // LISTAS E ACELERAÇÃO (10)
  { cat: "Listas e aceleração", text: "[Número] coisas que te fazem [resultado desejado] mais rápido em menos tempo." },
  { cat: "Listas e aceleração", text: "X [tipo de coisa] que me ajudaram a [resultado específico]." },
  { cat: "Listas e aceleração", text: "[Número] [ação necessária] para conquistares o teu tão sonhado [resultado]." },
  { cat: "Listas e aceleração", text: "[X] hábitos simples que mudaram completamente o meu [área de vida / trabalho]" },
  { cat: "Listas e aceleração", text: "[X] perguntas para te fazeres antes de [decisão importante do nicho]" },
  { cat: "Listas e aceleração", text: "[X] razões pelas quais ainda não conseguiste [resultado desejado]" },
  { cat: "Listas e aceleração", text: "[X] coisas que ninguém te conta sobre [tema] mas que fazem toda a diferença" },
  { cat: "Listas e aceleração", text: "[X] sinais de que já estás pronta para [próximo passo]" },
  { cat: "Listas e aceleração", text: "[X] substituições simples que mudam tudo em [área do nicho]" },
  { cat: "Listas e aceleração", text: "[X] erros que cometi em [área] — e como os evitar." },

  // IDENTIDADE E PERTENÇA (10)
  { cat: "Identidade e pertença", text: "Se andares muito comigo vais acabar ___." },
  { cat: "Identidade e pertença", text: "Querido algoritmo, mostra este vídeo a [perfil específico] nascidas entre [ano] e [ano]." },
  { cat: "Identidade e pertença", text: "Isto é para quem está farto de [situação limitante] e quer [resultado]." },
  { cat: "Identidade e pertença", text: "Se te identificas com [perfil / situação], este conteúdo é 100% para ti." },
  { cat: "Identidade e pertença", text: "Existe um tipo de pessoa que consegue [resultado] com facilidade. Reconheces-te?" },
  { cat: "Identidade e pertença", text: "O que separa quem [resultado positivo] de quem [resultado negativo]:" },
  { cat: "Identidade e pertença", text: "Para as que já chegaram a [situação específica] e querem [próximo nível]:" },
  { cat: "Identidade e pertença", text: "Avisa o teu [relação próxima] que precisa de ver isto sobre [tema]." },
  { cat: "Identidade e pertença", text: "Se [situação específica], provavelmente também [consequência comum]. Aqui está o porquê." },
  { cat: "Identidade e pertença", text: "Crescer comigo significa [transformação específica]. Estás pronta?" },

  // EXPERIÊNCIA E CONVERSA (10)
  { cat: "Experiência e conversa", text: "Se já ultrapassaste [desafio], deixa aqui o que ninguém te contou." },
  { cat: "Experiência e conversa", text: "Se fores 100% honesta contigo mesma... [pergunta direta do nicho]?" },
  { cat: "Experiência e conversa", text: "Faz-me uma pergunta sobre [tema] nos comentários. Respondo a todas." },
  { cat: "Experiência e conversa", text: "Conta-me: qual é o teu maior obstáculo com [tema do nicho]?" },
  { cat: "Experiência e conversa", text: "Posso perguntar-te algo? O que é que ainda não fizeste em relação a [tema]?" },
  { cat: "Experiência e conversa", text: "Qual foi o momento em que percebeste que precisavas de mudar [algo no nicho]?" },
  { cat: "Experiência e conversa", text: "Diz-me nos comentários: em que fase estás com [jornada do nicho]?" },
  { cat: "Experiência e conversa", text: "O que gostarias de ter sabido mais cedo sobre [tema]? Começo eu:" },
  { cat: "Experiência e conversa", text: "Que conselho darias ao teu eu de [X anos atrás] sobre [tema]?" },
  { cat: "Experiência e conversa", text: "Completa a frase: quando penso em [tema], o que me trava é ___." },
];

export const CATEGORIAS = ["Todas", ...Array.from(new Set(GANCHOS.map(g => g.cat)))];
