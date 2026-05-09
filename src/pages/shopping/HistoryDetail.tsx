import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Trash2, Repeat, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/Toast';
import {
  deletePhoto,
  deleteShoppingSession,
  useShoppingItems,
  useShoppingList,
  useShoppingSession,
} from '@/db/repo';
import type { ShoppingItem } from '@/types';
import { formatQty } from '@/lib/shopping';

export function ShoppingHistoryDetail() {
  const { id } = useParams();
  const session = useShoppingSession(id);
  const items = useShoppingItems();
  const list = useShoppingList(session?.listId);
  const navigate = useNavigate();
  const toast = useToast();
  const [previewing, setPreviewing] = useState<string | null>(null);

  const itemsById = useMemo(() => {
    const m = new Map<string, ShoppingItem>();
    items?.forEach((i) => m.set(i.id, i));
    return m;
  }, [items]);

  if (!session) {
    return (
      <div>
        <Link to="/shopping/history" className="text-sm text-ink-500">
          <ChevronLeft size={14} /> History
        </Link>
        <EmptyState
          title="Session not found"
          description="It may have been deleted."
          action={
            <Link to="/shopping/history" className="btn-primary">
              Back to history
            </Link>
          }
        />
      </div>
    );
  }

  if (session.completedAt === undefined) {
    // Stumbled into an in-progress row's detail page (e.g. via a bookmarked
    // URL). Send the user where it actually lives — the run page.
    return (
      <div>
        <Link to="/shopping/lists" className="text-sm text-ink-500">
          <ChevronLeft size={14} /> Lists
        </Link>
        <EmptyState
          title="Still in progress"
          description="This shop hasn't been wrapped up yet. Continue from the Lists page."
          action={
            <Link to={`/shopping/lists/${session.listId}/run`} className="btn-primary">
              Continue shopping
            </Link>
          }
        />
      </div>
    );
  }

  const listExists = !!list;

  const onDelete = async () => {
    if (!confirm('Delete this session and any photos attached to it?')) return;
    await Promise.all(session.photoIds.map((p) => deletePhoto(p)));
    await deleteShoppingSession(session.id);
    toast.show('Session deleted');
    navigate('/shopping/history');
  };

  const onReshop = () => {
    if (!listExists) return;
    // Re-shop pulls from the *current* list, not the historical snapshot.
    navigate(`/shopping/lists/${session.listId}/run`);
  };

  const checked = session.resolvedItems.filter((r) => r.checked).length;
  const total = session.resolvedItems.length;

  return (
    <div>
      <Link
        to="/shopping/history"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> History
      </Link>
      <PageHeader
        title={session.listName}
        subtitle={`${formatTs(session.completedAt ?? session.startedAt)} · ${checked}/${total} checked`}
        action={
          <button
            type="button"
            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            onClick={onDelete}
            aria-label="Delete session"
          >
            <Trash2 size={18} />
          </button>
        }
      />

      <div className="space-y-5">
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!listExists}
            onClick={onReshop}
            title={listExists ? 'Start a fresh run from the current list' : 'The underlying list was deleted'}
          >
            <Repeat size={16} /> Re-shop this list
          </button>
        </div>
        {!listExists && (
          <p className="text-xs text-ink-500 dark:text-ink-400">
            The underlying list was deleted, so re-shop is unavailable. The
            historical record below is preserved.
          </p>
        )}

        {session.photoIds.length > 0 && (
          <section className="card p-5">
            <div className="mb-3 text-sm font-medium">Photos ({session.photoIds.length})</div>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {session.photoIds.map((pid) => (
                <li key={pid}>
                  <button
                    type="button"
                    onClick={() => setPreviewing(pid)}
                    className="block w-full overflow-hidden rounded-xl"
                    aria-label="Preview photo"
                  >
                    <Thumbnail photoId={pid} size={96} className="!h-24 !w-full" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {session.notes && (
          <section className="card p-5">
            <div className="mb-2 text-sm font-medium">Notes</div>
            <p className="whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{session.notes}</p>
          </section>
        )}

        <section className="card p-5">
          <div className="mb-3 text-sm font-medium">Items</div>
          <ul className="space-y-1.5 text-sm">
            {session.resolvedItems.map((r, i) => {
              const item = itemsById.get(r.itemId);
              return (
                <li
                  key={`${r.itemId}-${i}`}
                  className={['flex items-center gap-2', r.checked ? '' : 'text-ink-400'].join(' ')}
                >
                  <span aria-hidden className="grid h-5 w-5 place-items-center">
                    {r.checked ? <Check size={14} /> : '·'}
                  </span>
                  <Thumbnail photoId={item?.photoId} size={28} />
                  <span className={['flex-1 truncate', r.checked ? '' : 'line-through'].join(' ')}>
                    {r.name ?? item?.name ?? <em className="text-ink-300">deleted item</em>}
                  </span>
                  <span className="text-xs text-ink-500">×{formatQty(r.qty)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title="Photo">
        {previewing && (
          <div className="flex justify-center">
            <Thumbnail photoId={previewing} size={320} className="!h-auto !w-full max-w-md" />
          </div>
        )}
      </Modal>
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
