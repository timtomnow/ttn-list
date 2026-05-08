import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="flex min-h-full bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-50">
      <Sidebar />
      <main
        className="min-h-full flex-1 pb-[calc(72px+var(--safe-bottom))] md:pb-0"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
