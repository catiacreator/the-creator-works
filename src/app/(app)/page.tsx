import { redirect } from 'next/navigation';

/** A porta de entrada é criar. O painel continua em /painel, fora do menu. */
export default function Home() {
  redirect('/criar');
}
