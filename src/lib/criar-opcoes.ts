/**
 * O catálogo do ecrã Criar: tipo de conteúdo, objetivo e formato.
 * Os textos dos formatos são o que a Cát.IA recebe como instrução — por isso
 * cada um diz o que é E como se escreve.
 */

export type Tipo = 'carrossel' | 'reels' | 'stories';
export type Objetivo = 'crescimento' | 'engajamento' | 'vendas';

export interface Opcao {
  id: string;
  nome: string;
  curto: string;
  comoSeEscreve: string;
  /** Só nos Reels do catálogo: A, B, C ou D. */
  familia?: string;
}

/**
 * As quatro famílias do catálogo de Reels.
 * Agrupam pelo que o formato exige na gravação, não pelo tema — é a divisão
 * útil quando se está a decidir o que dá para fazer hoje.
 */
export const FAMILIAS: Record<string, string> = {
  A: 'Falar para a câmara',
  B: 'Ecrã e demonstração',
  C: 'Texto e ritmo',
  D: 'Prova, série e comunidade',
};

export const TIPOS: Array<{ id: Tipo; nome: string; curto: string; icone: string }> = [
  { id: 'reels', nome: 'Reels', curto: 'Vídeo curto e dinâmico para o feed e o separador Reels', icone: 'Film' },
  { id: 'carrossel', nome: 'Carrossel', curto: 'Sequência de slides para contar uma história', icone: 'LayoutGrid' },
  { id: 'stories', nome: 'Stories', curto: 'Sequência estratégica de stories para envolver e converter', icone: 'Smartphone' },
];

export const OBJETIVOS: Array<{ id: Objetivo; nome: string; curto: string; icone: string; instrucao: string }> = [
  {
    id: 'crescimento',
    nome: 'Crescimento',
    curto: 'Atrair gente nova com conteúdo que se partilha',
    icone: 'TrendingUp',
    instrucao:
      'O objetivo é alcance. Escreve para quem ainda não te conhece: nada de referências internas, nada de "como já vos disse". O gancho tem de funcionar para um estranho a passar o dedo. Termina a pedir que sigam ou partilhem.',
  },
  {
    id: 'engajamento',
    nome: 'Envolvimento',
    curto: 'Gerar respostas, guardados e conversa no direct',
    icone: 'Heart',
    instrucao:
      'O objetivo é interação. Faz perguntas a que se responde em três palavras, provoca identificação ("se isto é a tua cara…"), e dá algo que se guarde para consultar. Termina a pedir um comentário concreto, não "diz o que achas".',
  },
  {
    id: 'vendas',
    nome: 'Vendas',
    curto: 'Transformar quem já te segue em cliente',
    icone: 'ShoppingBag',
    instrucao:
      'O objetivo é vender. Usa Problema · Agitação · Solução, com o custo de não resolver dito em concreto. Antecipa a objeção principal antes que ela apareça. Termina com um convite ao direct com uma palavra-chave, não com "compra já".',
  },
];

export const FORMATOS_CARROSSEL: Opcao[] = [
  {
    id: 'storytelling',
    nome: 'Storytelling',
    curto: 'Uma narrativa que se lê até ao fim',
    comoSeEscreve:
      'Conta uma história real com princípio, viragem e lição. Slide 1 é o momento de tensão, não o resumo. Cada slide avança a história; o último tira a lição e faz o convite.',
  },
  {
    id: 'dualidade',
    nome: 'Dualidade',
    curto: 'Comparação entre dois lados',
    comoSeEscreve:
      'Dois lados em confronto — antes e depois, amador e especialista, o que toda a gente faz e o que resulta. Cada slide do meio é um par: à esquerda o comum, à direita o certo.',
  },
  {
    id: 'erro-comum',
    nome: 'Erro comum',
    curto: 'Os erros que o teu público repete',
    comoSeEscreve:
      'Um erro por slide, com o nome do erro, porque acontece e o que fazer em vez disso. A capa nomeia o erro mais caro de todos.',
  },
  {
    id: 'pauta-quente',
    nome: 'Assunto do momento',
    curto: 'Algo que está a acontecer agora',
    comoSeEscreve:
      'Ancora num acontecimento recente do nicho e tira dali a lição aplicada. Mostra autoridade sobre a realidade, não sobre a teoria.',
  },
  {
    id: 'certo-errado',
    nome: 'Certo e errado',
    curto: 'O que funciona contra o que falha',
    comoSeEscreve:
      'Cada slide traz uma frase feita que se diz por aí e a correção. Direto ao ponto, sem meias palavras.',
  },
  {
    id: 'lista',
    nome: 'Lista',
    curto: 'Itens que se guardam para consultar',
    comoSeEscreve:
      'Uma lista numerada, um item por slide, cada um utilizável hoje. É o formato que gera mais guardados — por isso não deixes nenhum item vago.',
  },
  {
    id: 'padrao',
    nome: 'Outro formato',
    curto: 'A estrutura normal de carrossel',
    comoSeEscreve: 'Gancho na capa, uma ideia por slide, comando no fim.',
  },
];

export const FORMATOS_REELS: Opcao[] = [
  {
    id: 'lo-fi',
    nome: 'Lo-fi',
    curto: 'Autêntico, gravado sem produção',
    comoSeEscreve:
      'Escreve como se falasse para a câmara do telemóvel, sem guião decorado. Frases curtas, uma ideia, nada de introduções.',
  },
  {
    id: 'leia-legenda',
    nome: 'Lê a legenda',
    curto: 'Vídeo visual com o texto todo por cima',
    comoSeEscreve:
      'O peso está no texto sobreposto. Dá as frases exatas a pôr no ecrã, uma a uma, com o tempo de cada, e o que se vê por trás.',
  },
  {
    id: 'fala-dinamica',
    nome: 'Fala dinâmica',
    curto: 'A falar para a câmara, com cortes',
    comoSeEscreve:
      'Guião falado com marcas de corte a cada ideia. Indica onde cortar e o que muda de plano — é o corte que segura a atenção.',
  },
  {
    id: 'serie',
    nome: 'Série',
    curto: 'Conteúdo em episódios',
    comoSeEscreve:
      'Escreve o episódio como parte de uma série: liga ao anterior numa frase e deixa o gancho para o seguinte no fim.',
  },
  {
    id: 'sketch',
    nome: 'Sketch',
    curto: 'Encenação ou humor',
    comoSeEscreve:
      'Uma cena curta com duas vozes ou dois papéis. Indica falas e ações. O humor tem de servir a mensagem, não substituí-la.',
  },
  {
    id: 'rotina',
    nome: 'Rotina',
    curto: 'Bastidores e dia a dia',
    comoSeEscreve:
      'Mostra o processo por dentro, com o que dizer em cada plano. O valor está no que se vê e ninguém mostra.',
  },
  {
    id: 'narrado',
    nome: 'Narrado',
    curto: 'Voz por cima de imagens',
    comoSeEscreve:
      'Texto para ler em voz off, e ao lado o que se vê em cada momento. Escreve para ser dito, não para ser lido.',
  },
  {
    id: 'pauta-quente',
    nome: 'Assunto do momento',
    curto: 'Um tema que está a dar que falar no teu nicho',
    comoSeEscreve:
      'Pega no que está a acontecer agora — uma mudança do Instagram, uma ferramenta nova, uma polémica — e diz o que isso muda para quem te segue. Timing é tudo: escreve para publicar hoje. Posição primeiro, explicação depois.',
  },
  {
    id: 'padrao',
    nome: 'Outro formato',
    curto: 'Estrutura livre, com o esqueleto que resulta',
    comoSeEscreve:
      'Segue a estrutura base: [GANCHO] → [IDENTIFICAÇÃO] → [CONTEÚDO] → [CTA]. Se ela trouxer um Reels de referência, adapta essa estrutura ao nicho dela em vez de inventar outra.',
  },

  // ── o catálogo dos formatos, por famílias ─────────────────────
  // Cada ficha traz a estrutura com tempos, dois ganchos-modelo e o erro que
  // costuma matar aquele formato. É o que a Cát.IA recebe como instrução.
  {
    id: 'talking-head',
    nome: 'Talking head direto',
    curto: 'Tu de frente para a câmara, uma ideia inteira',
    familia: 'A',
    comoSeEscreve:
      'Serve para construir reconhecimento de rosto e voz. 0–3s gancho falado, já em movimento — começa a frase antes de o vídeo começar, nada de "olá, tudo bem?". 3–8s para quem é e porque importa agora. 8–25s a ideia, uma só, com um exemplo concreto e um número. 25–32s fecho e comando. Ganchos: "Ninguém te vai dizer isto porque dá trabalho de explicar:" · "Passei dois anos a fazer isto mal. Vou poupar-te o tempo." O erro que mata: plano fixo e voz plana — indica corte a cada 3 ou 4 segundos, nem que seja jump cut do mesmo plano.',
  },
  {
    id: 'opiniao-contra',
    nome: 'Opinião contra-corrente',
    curto: 'Desmontar uma crença aceite no nicho',
    familia: 'A',
    comoSeEscreve:
      'Alcance por comentário: divide a audiência de propósito. 0–3s a frase que contraria, curta e afirmativa, sem hedge. 3–10s reconhece porque é que toda a gente acredita no contrário. 10–25s o argumento com o mecanismo real e um caso ou número. 25–32s convite ao contraditório: "diz-me onde é que isto falha". Ganchos: "Publicar todos os dias é o pior conselho que se dá a quem está a começar." · "Não tens um problema de alcance. Tens um problema de oferta." O erro que mata: atacar pessoas em vez de ideias, ou defender o que não aguenta a primeira réplica.',
  },
  {
    id: 'resposta-direct',
    nome: 'Resposta a pergunta do direct',
    curto: 'A pergunta de alguém real faz o gancho',
    familia: 'A',
    comoSeEscreve:
      'Prova que há público que a procura. 0–3s lê a pergunta em voz alta enquanto o print aparece. 3–6s "recebo esta pergunta todas as semanas" — sinaliza que o problema é comum. 6–25s resposta com um passo acionável hoje. 25–32s "se tens a mesma dúvida, manda-me no direct". Ganchos: "Recebi esta pergunta ontem e a resposta incomoda:" · "«Já tentei tudo e não cresço.» Vamos ver o que é que «tudo» quer dizer." O erro que mata: responder a perguntas demasiado específicas de uma pessoa — escolhe a que 500 pessoas também têm.',
  },
  {
    id: 'micro-aula',
    nome: 'Micro-aula',
    curto: 'Um conceito explicado do zero em 30 segundos',
    familia: 'A',
    comoSeEscreve:
      'Autoridade técnica — o formato que faz pensar "esta pessoa sabe mesmo". 0–3s nomeia o conceito e promete que em 30 segundos fica percebido. 3–8s uma analogia do mundo real, uma só. 8–22s o conceito aplicado ao caso concreto do público. 22–30s a consequência prática: o que muda amanhã. Sem jargão — o teste é se a mãe dela percebeu. Ganchos: "Toda a gente usa a palavra «funil» e quase ninguém sabe o que é. Trinta segundos." · "Isto é a coisa mais simples do Instagram e a que mais gente faz ao contrário." O erro que mata: três conceitos no mesmo vídeo. Um conceito, um Reel.',
  },
  {
    id: 'storytime',
    nome: 'Storytime',
    curto: 'Um episódio real com tensão e desfecho',
    familia: 'A',
    comoSeEscreve:
      'Ligação emocional: esquecem-se listas, lembram-se histórias. Normalmente um erro dela que custou dinheiro, tempo ou orgulho. 0–4s entra a meio da tensão, não pelo princípio cronológico. 4–12s o contexto mínimo para a história fazer sentido. 12–25s a viragem: o que correu mal e porquê. 25–35s a lição transferível. Ganchos: "Cobrei 200 euros por um trabalho que valia 2000. A conta que fiz mal:" · "O maior erro da minha carreira aconteceu num sábado às 11 da noite." O erro que mata: história sem lição, ou lição colada à força no fim.',
  },
  {
    id: 'oi-pessoa',
    nome: 'Oi, pessoa',
    curto: 'A voz off pergunta, quem está à frente responde',
    familia: 'A',
    comoSeEscreve:
      'Serve para ensinar sem parecer aula: a pergunta vem de fora e ela só responde — é conversa, não discurso. Quem filma (ou a voz gravada depois) chama pelo nome e pergunta; ela responde a olhar para quem pergunta, nunca para a lente. Escreve as falas identificadas: [VOZ OFF] e [ELA]. 0–2s a chamada, curta, com a imagem já a andar: [VOZ OFF] «Óh Cátia.» [ELA] «Oi.» 2–5s a pergunta, dita com as palavras de quem a segue e não com jargão — menos de dez palavras. 5–22s a resposta, uma ideia só, com um exemplo concreto; a meio entra a segunda pergunta a relançar («e se não der?», «mas isso não dá muito trabalho?»). 22–32s a última pergunta é o comando: [VOZ OFF] «e quem quiser isso faz o quê?» Ganchos: [VOZ OFF] «Óh Cátia, como é que eu escrevo uma legenda que vende?» · [VOZ OFF] «Oi. Posso fazer uma pergunta parva?» — [ELA] «Podes. E é a que toda a gente tem.» O erro que mata: a voz off a fazer discurso em vez de perguntar. Se a pergunta passa de uma linha, deixa de ser conversa e volta a ser aula.',
  },
  {
    id: 'tutorial',
    nome: 'Tutorial passo a passo',
    curto: 'Uma tarefa executada do início ao resultado',
    familia: 'B',
    comoSeEscreve:
      'É o formato mais guardado que existe. 0–3s mostra o RESULTADO primeiro — ninguém fica pelo processo sem ver o destino. 3–6s delimita o esforço: "três passos, dois minutos, ferramenta gratuita". 6–35s os passos numerados na tela, um a um, ao ritmo de execução. 35–40s repete o resultado e "guarda para fazer depois". Ganchos: "Isto demorava-me 4 horas. Agora demora 6 minutos. Passo a passo:" · "Nunca mais escrevas legendas à mão. Vê:" O erro que mata: passos que só funcionam com a conta já configurada — diz os pré-requisitos nos primeiros 5 segundos.',
  },
  {
    id: 'demo-ferramenta',
    nome: 'Demonstração de ferramenta',
    curto: 'Uma ferramenta a fazer algo espantoso, ao vivo',
    familia: 'B',
    comoSeEscreve:
      'Aqui o objetivo é o espanto, não a execução — é alcance frio, gente que ainda não a conhece partilha porque a ferramenta é a notícia. 0–3s o momento mais impressionante do resultado, fora de ordem. 3–8s nomeia a ferramenta e o que ela acabou de fazer. 8–25s a demonstração corrida, com o que se escreveu visível na tela. 25–32s "comenta FERRAMENTA que eu mando o link". Ganchos: "Escrevi uma frase e ela fez o trabalho de uma tarde inteira." · "Esta ferramenta é gratuita e devia ser proibida." O erro que mata: mostrar a ferramenta e não mostrar o input — o valor está no que se escreveu.',
  },
  {
    id: 'green-screen',
    nome: 'Green screen com prova',
    curto: 'Comentar um print, uma notícia ou um gráfico',
    familia: 'B',
    comoSeEscreve:
      'Ancora a opinião em algo verificável, o que trava o "diz isso porquê?". 0–3s "viste isto?" — o print entra ao mesmo tempo que a pergunta. 3–10s lê ou aponta a parte que interessa, destacada. 10–25s a leitura dela: o que é que isto significa para quem a segue. 25–32s a ação recomendada, concreta. Ganchos: "O Instagram mudou uma coisa esta semana e quase ninguém reparou." · "Este comentário resume o erro de 90% das pessoas que me escrevem." O erro que mata: print ilegível — se não se lê no telemóvel a meio metro, amplia ou reescreve por cima.',
  },
  {
    id: 'antes-depois',
    nome: 'Antes e depois',
    curto: 'Dois estados da mesma coisa, em corte seco',
    familia: 'B',
    comoSeEscreve:
      'A transformação é o argumento; não precisa de ser explicada. 0–2s o "depois", sempre primeiro. 2–5s corte seco para o "antes" — o contraste é o gancho. 5–22s as três alterações que fizeram a diferença, numeradas. 22–30s "aplica a primeira hoje". Ganchos: "Mudei três coisas neste perfil. A terceira é a que ninguém faz." · "Mesma pessoa, mesmo produto, mesma semana. Só mudou o texto." O erro que mata: "antes" fraco de propósito — nota-se o exagero e perde-se a confiança toda de uma vez.',
  },
  {
    id: 'comparacao',
    nome: 'Comparação lado a lado',
    curto: 'Duas opções no mesmo critério, com vencedor',
    familia: 'B',
    comoSeEscreve:
      'Resolve a indecisão de quem já está a comparar — público próximo da compra. 0–3s "X ou Y? Testei os dois com o mesmo trabalho." 3–8s o critério de avaliação, um só e explícito. 8–25s os dois resultados, no mesmo enquadramento. 25–32s o veredicto com a condição: "para isto, X; para aquilo, Y". Ganchos: "Paguei os dois durante um mês para poder dizer isto com certeza." · "Um é gratuito, o outro custa 20€/mês. A diferença não é a que esperas." O erro que mata: não declarar vencedor. "Depende" é o que a pessoa já pensava antes.',
  },
  {
    id: 'lista-rapida',
    nome: 'Lista rápida',
    curto: 'Número no gancho, itens em sequência acelerada',
    familia: 'C',
    comoSeEscreve:
      'O cavalo de trabalho do calendário: previsível e por isso fiável. 0–3s número, benefício e prazo: "5 ganchos que uso todas as semanas". 3–28s um item a cada 4 ou 5 segundos, com o número sempre visível na tela. 28–34s "guarda — vais precisar do número 4". Ganchos: "7 erros que estão a matar o teu alcance. O 5 é o mais comum." · "3 frases que fecham venda no direct sem parecer venda." O erro que mata: itens desiguais, dois fortes e cinco de enchimento. Se só há 3 bons, faz-se uma lista de 3.',
  },
  {
    id: 'broll-legendas',
    nome: 'B-roll com legendas',
    curto: 'Imagens tuas em movimento, texto todo na tela',
    familia: 'C',
    comoSeEscreve:
      'Para dias sem voz e sem disposição — e para quem vê Reels sem som, que é muita gente. Não se diz uma palavra. 0–3s primeira linha de texto grande, ao centro: é o Reel inteiro num ecrã. 3–25s uma frase por plano, 3 a 4 segundos cada, música com ritmo marcado. 25–30s última frase é o comando, escrito. Ganchos: "Se estás há 6 meses a publicar e nada acontece, lê isto até ao fim." · "Não é falta de talento. É falta de método. Explico em 20 segundos." O erro que mata: texto pequeno ou onde a interface do Instagram o tapa.',
  },
  {
    id: 'mito-verdade',
    nome: 'Mito vs verdade',
    curto: 'O que se diz contra o que acontece de facto',
    familia: 'C',
    comoSeEscreve:
      'Corrige o que impede o público de comprar — muita objeção de venda é um mito por resolver. 0–3s o mito, dito como se fosse verdade; deixa-o pousar um segundo. 3–6s "falso", em corte seco ou mudança de cor. 6–22s o que acontece de facto, com o mecanismo explicado. 22–30s o que fazer em vez disso. Ganchos: "«Tens de publicar todos os dias.» Isto está errado e vou mostrar-te porquê." · "«Hashtags já não funcionam.» Meia verdade — e a outra metade importa." O erro que mata: escolher mitos em que já ninguém acredita.',
  },
  {
    id: 'pov',
    nome: 'POV',
    curto: 'Uma situação reconhecível, encenada em segundos',
    familia: 'C',
    comoSeEscreve:
      'Partilhas por identificação — "isto sou eu". 0–2s a frase de contexto na tela: "POV: publicaste às 9h e às 11h tinhas 40 views." 2–12s a encenação — expressão, não palavras. 12–20s a viragem ou o remate, humor ou alívio. Ganchos: "POV: escreveste a legenda perfeita e ninguém comentou." · "POV: o cliente diz «vou pensar» e desaparece." O erro que mata: POV genérico que serve a qualquer nicho. Quanto mais específica a situação, mais gente se reconhece.',
  },
  {
    id: 'slides-movimento',
    nome: 'Slides em movimento',
    curto: 'Um carrossel convertido em vídeo',
    familia: 'C',
    comoSeEscreve:
      'Leva ao alcance dos Reels o que já provou funcionar em carrossel. 0–3s slide de capa, três segundos parados — tempo de ler. 3–28s um slide a cada 3 ou 4 segundos, no máximo oito. 28–32s slide final com o comando e loop de volta ao primeiro. Ganchos: "O checklist que corro antes de publicar qualquer coisa." · "As 6 perguntas que faço a um perfil antes de mexer numa vírgula." O erro que mata: ritmo depressa demais para a densidade do texto — se não dá para ler devagar, o slide fica mais tempo ou tem menos texto.',
  },
  {
    id: 'estudo-caso',
    nome: 'Estudo de caso',
    curto: 'Um resultado real, com números, do problema ao fim',
    familia: 'D',
    comoSeEscreve:
      'Fundo de funil: responde à pergunta silenciosa "isto funciona mesmo?". 0–3s o número do resultado, isolado: "de 300 para 11 mil em 40 dias". 3–8s o ponto de partida, sem embelezar. 8–25s as três alavancas que mexeram — a lógica, não o passo a passo todo. 25–35s "se o teu caso se parece com este, escreve-me DIAGNÓSTICO". Ganchos: "Este perfil tinha 300 seguidores em janeiro. Vou mostrar exatamente o que mudámos." · "Zero anúncios, zero sorte. Três decisões." O erro que mata: números sem ponto de partida nem tempo.',
  },
  {
    id: 'para-de-fazer',
    nome: 'Para de fazer isto',
    curto: 'Um erro que vês repetido, com a correção ao lado',
    familia: 'D',
    comoSeEscreve:
      'Acusatório na forma, útil no conteúdo: a pessoa reconhece-se, sente a picada e guarda para corrigir. 0–3s o erro nomeado sem rodeios, no imperativo: "para de…". 3–10s porque é que parece boa ideia — valida a intenção antes de corrigir o método. 10–24s o custo real do erro, com um exemplo. 24–32s a correção, executável hoje. Ganchos: "Para de pedir para seguires no fim do Reel. Está a custar-te alcance." · "Se escreves «link na bio», estás a perder metade das pessoas. Faz assim:" O erro que mata: apontar o erro e não dar a correção — a picada sem saída gera unfollow.',
  },
  {
    id: 'serie-numerada',
    nome: 'Série numerada',
    curto: 'Episódios com nome fixo e número visível',
    familia: 'D',
    comoSeEscreve:
      'A previsibilidade é o produto: cria o hábito de voltar e resolve o problema de decidir o tema todos os dias. 0–2s assinatura da série e o número, sempre no mesmo sítio da tela. 2–5s o tema do episódio. 5–28s o conteúdo, na mesma estrutura de todos os episódios. 28–33s "segue para não perder o #5". Ganchos: "Erros de perfil, episódio 4: a bio que descreve em vez de vender." · "Prompt da semana #7 — este é o que mais uso e nunca mostrei." O erro que mata: mudar o formato entre episódios. Só o conteúdo muda.',
  },
  {
    id: 'trend-nicho',
    nome: 'Trend adaptada ao nicho',
    curto: 'Estrutura emprestada, substância tua',
    familia: 'D',
    comoSeEscreve:
      'Apanha distribuição extra sem inventar formato — útil para dias de baixa energia. 0–3s reconhecimento do áudio e a primeira linha já adaptada ao tema dela. 3–20s os tempos da trend cumpridos à risca: o público e o algoritmo reconhecem o padrão. 20–28s o remate dela, com a sua tese. Ganchos: "(áudio em alta) + «quando o cliente diz que vai pensar»" · "(áudio em alta) + «as 3 desculpas que ouço todas as semanas»". O erro que mata: chegar tarde. Uma trend dura 5 a 10 dias úteis; se não der para gravar em 48 horas, salta-se.',
  },
  {
    id: 'bastidor-trabalho',
    nome: 'Bastidor de trabalho',
    curto: 'O processo real, com o método à vista',
    familia: 'D',
    comoSeEscreve:
      'Não é rotina aspiracional, é trabalho a acontecer: quem vê o processo assume a competência sem ela precisar de a afirmar. 0–3s um plano do trabalho a meio, com uma frase que revela o que está em jogo. 3–20s três momentos do processo, com o critério de decisão dito em voz alta. 20–30s o resultado e o princípio que se repete em todos os trabalhos. Ganchos: "São 7h da manhã e estou a reescrever isto pela quarta vez. Porquê:" · "Isto é o que acontece antes de um Reel de 30 segundos." O erro que mata: bastidor sem método à vista — café, portátil e música bonita é papel de parede.',
  },
];

export const FORMATOS_STORIES: Opcao[] = [
  {
    id: 'conexao',
    nome: 'Story de conexão',
    curto: 'Cria proximidade',
    comoSeEscreve:
      'Cinco stories: identificação, bastidor, opinião, pergunta com caixa, e resposta. O objetivo é ser vista como gente, não como marca.',
  },
  {
    id: 'desejo',
    nome: 'Story de desejo',
    curto: 'Desperta vontade',
    comoSeEscreve:
      'Cinco stories que mostram o resultado a acontecer a outra pessoa. Prova antes de promessa; desejo antes de preço.',
  },
  {
    id: 'vendas',
    nome: 'Narrativa de vendas',
    curto: 'Sequência para converter',
    comoSeEscreve:
      'Cinco stories: sondagem que toca na dor, agitação técnica, prova real, convite consultivo com palavra-chave, e o que dizer no direct antes de falar de preço.',
  },
  {
    id: 'premium',
    nome: 'Conteúdo premium',
    curto: 'Ensina de forma leve',
    comoSeEscreve:
      'Cinco stories que ensinam uma coisa pequena e completa. Cada um vale por si; o conjunto deixa a pessoa a saber fazer.',
  },
];

export function formatosDe(tipo: Tipo) {
  return tipo === 'reels'
    ? FORMATOS_REELS
    : tipo === 'stories'
      ? FORMATOS_STORIES
      : FORMATOS_CARROSSEL;
}
