/**
 * Os tectos da assinatura, num sítio só.
 *
 * Estão aqui e não espalhados pelas rotas porque são números que a app tem de
 * dizer à pessoa antes de ela bater neles — a página das fotografias mostra
 * "3 de 10" sem ter de adivinhar, e a rota que recusa usa exatamente o mesmo
 * número. Um tecto que a interface não sabe dizer é um tecto que só aparece
 * como erro.
 */

/**
 * Quantas fotografias cabem.
 *
 * O tecto é mesmo um tecto: quem lá chegou tem de apagar para pôr outra. Não
 * se apaga nada por ela — uma fotografia sua que desaparecesse sozinha era
 * uma fotografia perdida, e isso não se faz.
 */
export const TECTO_FOTOS = 10;

/** Quantos templates cabem. */
export const TECTO_TEMPLATES = 5;
