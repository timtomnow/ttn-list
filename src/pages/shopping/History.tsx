import { Link } from 'react-router-dom';
import { ChevronLeft, History as HistoryIcon, Camera, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useShoppingSessions } from '@/db/repo';

export function ShoppingHistory() {
  const sessions = useShoppingSessions();

  return (
    <div>
      <Link
        to="/shopping"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> Shopping
      </Link>
      <PageHeader
        title="History"
        subtitle={sessions ? `${sessions.length} past ${sessions.length === 1 ? 'session' : 'sessions'}` : undefined}
      />

      {!sessions || sessions.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={28} />}
          title="No sessions yet"
          description="Once you finish a Shop it run, you'll see it here with photos, notes, and a re-shop button."
        />
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const checked = s.resolvedItems.filter((r) => r.checked).length;
            return (
              <li key={s.id}>
                <Link
                  to={s.id}
                  className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 transition hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300">
                    <HistoryIcon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.listName}</div>
                    <div className="truncate text-xs text-ink-500 dark:text-ink-400">
                      {formatTs(s.completedAt ?? s.startedAt)} · {checked}/{s.resolvedItems.length} checked
                      {s.photoIds.length > 0 && (
                        <>
                          {' · '}
                          <span className="inline-flex items-center gap-0.5">
                            <Camera size={11} /> {s.photoIds.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-ink-400 dark:text-ink-500" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
