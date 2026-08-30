/**
 * A análise de perfil.
 * A estrutura é fixa de propósito: seis blocos sempre iguais, para poderes
 * comparar o antes e o depois quando voltares a analisar daqui a um mês.
 */

export interface DadosDoPerfil {
  handle: string;
  nome?: string;
  bio?: string;
  destaques?: string;
  link?: string;
  seguidores?: string;
  notas?: string;
}

export function promptDaAnalise(d: DadosDoPerfil) {
  const linhas = [
    `@ do perfil: ${d.handle.replace(/^@/, '')}`,
    d.nome && `Nome estratégico: ${d.nome}`,
    d.bio && `Biografia:\n${d.bio}`,
    d.destaques && `Destaques: ${d.destaques}`,
    d.link && `Link da bio: ${d.link}`,
    d.seguidores && `Seguidores: ${d.seguidores}`,
    d.notas && `Notas: ${d.notas}`,
  ].filter(Boolean);

  return `Analisa este perfil de Instagram.

${linhas.join('\n')}

Escreve o relatório exatamente com estes seis blocos, por esta ordem, e nada
mais — sem introdução nem despedida:

📌 VISÃO GERAL DO PERFIL
Nome/Username · Bio e proposta de valor · Nicho identificado · Público-alvo
aparente. Uma linha para cada, a dizer o que se percebe dos dados.

📝 ANÁLISE DE ESTRUTURA
Username e Nome · Biografia · Destaques. O que está bem construído e porquê.

🎯 POSICIONAMENTO
Diferencial competitivo · Tom de voz · Nível de autoridade demonstrado.

💪 PONTOS FORTES
Três a quatro, cada um com o título a negrito e a explicação a seguir.

🚀 OPORTUNIDADES DE MELHORIA
Três a quatro, cada uma com o título a negrito. Aponta o problema concreto,
não uma vaguidade. Se dois destaques se sobrepõem, di-lo. Se falta prova
social, di-lo.

✅ RECOMENDAÇÕES PRÁTICAS
Cinco, numeradas, cada uma executável esta semana. Nada de "criar mais
conteúdo de valor" — diz o quê, onde e com que palavras.

Usa o briefing dela (o bloco QUEM ESCREVE, mais acima) para julgar o perfil:
se a bio fala para um público mais vago do que o cliente ideal que ela
descreveu, aponta-o. Se o diferencial que ela reivindica no briefing não
aparece em lado nenhum do perfil, aponta-o também — é o desperdício mais caro
que há.

Regras de escrita: português de Portugal, tratamento por tu. Analisa só o que
está nos dados e no briefing; onde faltar informação, diz que falta em vez de
inventares. Nada de elogio vazio — o que serve é o que se pode corrigir.`;
}
