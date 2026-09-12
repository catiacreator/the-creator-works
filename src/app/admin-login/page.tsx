import type { Metadata } from 'next';
import { Porta } from './porta';

/**
 * A porta de serviço.
 *
 * Não está no menu, não está ligada a partir de lado nenhum, e não se
 * anuncia. Quem lá chega é porque sabe o endereço.
 *
 * O `noindex` não é segurança — quem quer encontrar isto não vai ao Google —
 * mas não custa nada e evita que a página apareça onde não deve.
 */
export const metadata: Metadata = {
  title: 'Entrada',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return <Porta />;
}
