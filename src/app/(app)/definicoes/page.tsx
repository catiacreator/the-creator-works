import { Suspense } from 'react';
import DefinicoesClient from './client';

export const dynamic = 'force-dynamic';

export default function DefinicoesPage() {
  return (
    <Suspense fallback={null}>
      <DefinicoesClient />
    </Suspense>
  );
}
