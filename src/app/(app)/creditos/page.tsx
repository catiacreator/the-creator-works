import { redirect } from 'next/navigation';

/**
 * `/creditos` — o caminho curto para a tabela.
 *
 * A tabela vive nas Definições, e é lá que faz sentido estar. Mas "vai às
 * Definições e abre a linha dos Créditos" não é uma coisa que se diga num
 * recado nem que se ponha num link — e é precisamente quando alguém pergunta
 * "quanto é que isto me custa?" que ela precisa de estar a um clique.
 *
 * Por isso este endereço existe e não faz mais nada senão levar lá.
 */
export default function CreditosPage() {
  redirect('/definicoes?painel=creditos');
}
