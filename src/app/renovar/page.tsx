import { precos } from '@/lib/assinatura';
import { RenovarCliente } from './renovar-cliente';

/** Os links vêm do ambiente, lidos a cada pedido — ver src/lib/assinatura.ts. */
export const dynamic = 'force-dynamic';

export default function RenovarPage() {
  return <RenovarCliente precos={precos()} />;
}
