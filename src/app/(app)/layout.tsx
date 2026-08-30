import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { JobRunner } from '@/components/job-runner';
import { getUser } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Nav email={user.email} />
      <main className="flex-1 overflow-x-hidden bg-paper px-8 pb-12 pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <JobRunner />
    </div>
  );
}
