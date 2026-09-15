import { redirect } from 'next/navigation';

/**
 * A porta de entrada é o CarouselSnap.
 *
 * Era o /criar, quando o Creator Works era a app toda. Deixou de ser: o Snap
 * é a página principal, e é de lá que se escolhe o que fazer — incluindo vir
 * para cá. O painel continua em /painel, fora do menu.
 */
export default function Home() {
  redirect('/snap');
}
