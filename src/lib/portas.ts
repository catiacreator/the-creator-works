/**
 * As portas: os caminhos que têm de estar sempre abertos.
 *
 * O middleware confere, a cada pedido, se quem tem sessão tem lugar nesta
 * app. Quem não tem é posto na rua — `signOut()` e a página de entrada. É a
 * fechadura a funcionar, e para as páginas de dentro está certo.
 *
 * Mas há caminhos cuja razão de existir é precisamente **dar** lugar a quem
 * ainda não tem. Numa porta, a fechadura está do lado de dentro; pô-la
 * também do lado de fora é trancar a casa com a chave lá dentro.
 *
 * Foi o que aconteceu. O `/entrar` — a porta do CarouselSnap — ficou atrás da
 * fechadura: quem lá chegava com uma sessão velha e sem lugar era expulso
 * antes de o bilhete ser sequer lido. O bilhete não chegava a ser conferido,
 * a porta não chegava a correr, e a pessoa via a página de entrada como se
 * nada tivesse sido feito. Uma pessoa que tenha tentado uma vez e falhado
 * fica presa: cada tentativa seguinte bate na sessão que a primeira deixou.
 *
 * Por isso a lista está aqui, num sítio só, com o nome do que é: as portas.
 * Quem acrescentar uma maneira nova de alguém entrar tem de a pôr aqui — e o
 * nome deste ficheiro é o lembrete.
 */

/**
 * Os caminhos que o middleware deixa passar sem perguntar nada.
 *
 * Cada um é uma maneira de entrar, e nenhum dá acesso por si: o `/entrar`
 * confere um bilhete assinado, o `/admin-login` confere um código, o
 * `/acesso` confere um código de convite. A verificação é deles, não da
 * fechadura que está antes deles.
 */
export const PORTAS = [
  /** a porta do CarouselSnap: um bilhete assinado */
  '/entrar',
  /** a porta de serviço da admin: um código que só ela tem */
  '/admin-login',
  '/api/admin-login',
  /** o resgate de um código de convite, onde nasce uma conta */
  '/acesso',
  /** a página que diz onde é a entrada, para quem não tem lugar nenhum */
  '/assinar',
] as const;

/** É este caminho uma porta? */
export function ePorta(caminho: string): boolean {
  return (PORTAS as readonly string[]).includes(caminho);
}
