import { Suspense } from 'react';
import ChatClient from './client';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatClient />
    </Suspense>
  );
}
