import { carouselSnap } from '@/lib/passagem';
import { RenovarCliente } from './renovar-cliente';

/** O endereço do CarouselSnap vem do ambiente, lido a cada pedido. */
export const dynamic = 'force-dynamic';

export default function RenovarPage() {
  return <RenovarCliente snap={carouselSnap()} />;
}
