import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
  Camera,
  Eye,
  Lock,
  Unlock,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/Toast';
import {
  addPhoto,
  createShoppingSession,
  deletePhoto,
  deleteShoppingSession,
  findInProgressShoppingSession,
  updateShoppingSession,
  useShoppingGroups,
  useShoppingItems,
  useShoppingList,
} from '@/db/repo';
import type { ShoppingItem, ShoppingResolvedItem } from '@/types';
import { formatQty, resolveShoppingList, seedResolvedItems } from '@/lib/shopping';
import { useWakeLock } from '@/hooks/useWakeLock';

type BootInfo = { sessionId: string; snapshotName: string; startedAt: number; originalOrder?: string[] };

export function ShoppingRun() {
  const { id } = useParams();
  const list = useShoppingList(id);
  const items = useShoppingItems();
  const groups = useShoppingGroups();
  const navigate = useNavigate();
  const toast = useToast();

  // Resolved-items state holds the runtime checked/order array. It's
  // hydrated either from an existing in-progress session row (resume) or
  // from a fresh resolve of the current list (new run). Either way, after
  // hydration we write changes back to the session row on every mutation
  // so backing out and returning preserves progress.
  const [boot, setBoot] = useState<BootInfo | null>(null);
  const [resolved, setResolved] = useState<ShoppingResolvedItem[] | null>(null);
  const [mode, setMode] = useState<'shopping' | 'completing'>('shopping');

  const itemsById = useMemo(() => {
    const m = new Map<string, ShoppingItem>();
    items?.forEach((i) => m.set(i.id, i));
    return m;
  }, [items]);

  // Boot: try to resume; otherwise wait for libraries and create fresh.
  useEffect(() => {
    if (boot) return;
    if (!id) return;
    let cancelled = false;
    (async () => {
      const existing = await findInProgressShoppingSession(id);
      if (cancelled) return;
      if (existing) {
        setResolved(existing.resolvedItems);
        setBoot({
          sessionId: existing.id,
          snapshotName: existing.listName,
          startedAt: existing.startedAt,
          originalOrder: existing.originalOrder,
        });
        return;
      }
      // No in-progress; need list + libraries to start fresh. Effect re-runs
      // when those become available.
      if (!list || !items || !groups) return;
      const rows = resolveShoppingList(list, items, groups);
      const seeded = seedResolvedItems(rows);
      const originalOrder = seeded.map((r) => r.itemId);
      const startedAt = Date.now();
      const session = await createShoppingSession({
        listId: id,
        listName: list.name,
        startedAt,
        resolvedItems: seeded,
        originalOrder,
        photoIds: [],
      });
      if (cancelled) return;
      setResolved(seeded);
      setBoot({ sessionId: session.id, snapshotName: list.name, startedAt, originalOrder });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, list, items, groups, boot]);

  const wakeLock = useWakeLock(true);

  // If list is undefined and we have no in-progress to resume from, we're
  // either still loading or the list was deleted. We can't tell apart from
  // useLiveQuery's return value, so stay in "Preparing…" — the user can
  // back out via the breadcrumb.
  if (!boot || !resolved) {
    return (
      <div>
        <Link
          to="/shopping/lists"
          className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
        >
          <ChevronLeft size={16} /> Lists
        </Link>
        <p className="text-sm text-ink-500">Preparing…</p>
      </div>
    );
  }

  /** Apply a state change AND mirror it to the in-progress session row. */
  const persist = (next: ShoppingResolvedItem[]) => {
    setResolved(next);
    void updateShoppingSession(boot.sessionId, { resolvedItems: next });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= resolved.length) return;
    const out = resolved.slice();
    const [m] = out.splice(idx, 1);
    out.splice(next, 0, m);
    persist(out);
  };

  const toggle = (idx: number) =>
    persist(resolved.map((r, i) => (i === idx ? { ...r, checked: !r.checked } : r)));

  const sinkChecked = () => {
    const unchecked = resolved.filter((r) => !r.checked);
    const checked = resolved.filter((r) => r.checked);
    persist([...unchecked, ...checked]);
  };

  const resetOrder = () => {
    if (!boot.originalOrder) return;
    const rankOf = new Map(boot.originalOrder.map((id, i) => [id, i]));
    const next = resolved.slice().sort((a, b) => (rankOf.get(a.itemId) ?? Infinity) - (rankOf.get(b.itemId) ?? Infinity));
    persist(next);
  };

  const onRestart = async () => {
    if (!list || !items || !groups || !id) {
      toast.show('Cannot restart — list libraries not loaded yet', 'error');
      return;
    }
    if (!confirm('Discard this shop and start over from the current list?')) return;
    await deleteShoppingSession(boot.sessionId);
    const rows = resolveShoppingList(list, items, groups);
    const seeded = seedResolvedItems(rows);
    const originalOrder = seeded.map((r) => r.itemId);
    const startedAt = Date.now();
    const session = await createShoppingSession({
      listId: id,
      listName: list.name,
      startedAt,
      resolvedItems: seeded,
      originalOrder,
      photoIds: [],
    });
    setResolved(seeded);
    setBoot({ sessionId: session.id, snapshotName: list.name, startedAt, originalOrder });
    toast.show('Restarted');
  };

  const checkedCount = resolved.filter((r) => r.checked).length;
  const total = resolved.length;
  const allChecked = total > 0 && checkedCount === total;

  if (mode === 'completing') {
    return (
      <CompletionView
        sessionId={boot.sessionId}
        listName={boot.snapshotName}
        resolved={resolved}
        itemsById={itemsById}
        onCancel={() => setMode('shopping')}
        onSaved={(savedId) => {
          toast.show('Session saved');
          navigate(`/shopping/history/${savedId}`);
        }}
      />
    );
  }

  return (
    <div>
      <Link
        to="/shopping/lists"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> Lists
      </Link>
      <PageHeader
        title={boot.snapshotName}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <span>{checkedCount} of {total} checked</span>
            <WakeLockBadge state={wakeLock} />
          </span>
        }
        action={
          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn-ghost h-9 px-2"
              onClick={onRestart}
              aria-label="Restart shop"
              title="Restart shop"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setMode('completing')}
              disabled={total === 0 && checkedCount === 0}
            >
              <Check size={16} /> Done
            </button>
          </div>
        }
      />

      {total > 0 && (checkedCount > 0 || boot.originalOrder) && (
        <div className="mb-4 flex items-center gap-2">
          {checkedCount > 0 && (
            <button
              type="button"
              className="btn-secondary h-8 px-3 text-sm"
              onClick={sinkChecked}
            >
              <ChevronsDown size={14} /> Bought to bottom
            </button>
          )}
          {boot.originalOrder && (
            <button
              type="button"
              className="h-8 rounded-lg px-3 text-sm text-ink-400 hover:bg-ink-100 hover:text-ink-600 dark:hover:bg-ink-800 dark:hover:text-ink-300"
              onClick={resetOrder}
            >
              Reset order
            </button>
          )}
        </div>
      )}

      {total === 0 ? (
        <EmptyState
          title="Nothing to shop"
          description="This list is empty, or every item has been deleted from your library."
          action={
            <button type="button" className="btn-primary" onClick={() => setMode('completing')}>
              Wrap up anyway
            </button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {resolved.map((r, idx) => {
            const item = itemsById.get(r.itemId);
            return (
              <li key={`${r.itemId}-${idx}`}>
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className={[
                    'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition',
                    r.checked
                      ? 'border-ink-200/60 bg-ink-50 text-ink-400 dark:border-ink-800/60 dark:bg-ink-900/40 dark:text-ink-500'
                      : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2',
                      r.checked
                        ? 'border-ink-900 bg-ink-900 text-ink-50 dark:border-ink-50 dark:bg-ink-50 dark:text-ink-900'
                        : 'border-ink-300 dark:border-ink-600',
                    ].join(' ')}
                    aria-hidden
                  >
                    {r.checked && <Check size={14} />}
                  </span>
                  <Thumbnail photoId={item?.photoId} size={40} />
                  <span className={['min-w-0 flex-1 truncate text-base', r.checked ? 'line-through' : ''].join(' ')}>
                    {item?.name ?? <em className="text-ink-400">deleted item</em>}
                  </span>
                  <span className="text-sm font-medium text-ink-500">×{formatQty(r.qty)}</span>
                </button>
                <div className="mt-1 flex justify-end gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    onClick={() => move(idx, 1)}
                    disabled={idx === total - 1}
                    className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {allChecked && (
        <div className="sticky bottom-4 mt-6">
          <button
            type="button"
            className="btn-primary w-full shadow-lg"
            onClick={() => setMode('completing')}
          >
            <Check size={16} /> Wrap up
          </button>
        </div>
      )}
    </div>
  );
}

function WakeLockBadge({ state }: { state: ReturnType<typeof useWakeLock> }) {
  if (state.status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        <Lock size={10} /> screen on
      </span>
    );
  }
  if (state.status === 'unsupported' || state.status === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-500 dark:bg-ink-800 dark:text-ink-400"
        title={state.status === 'error' ? state.message : 'Wake lock not supported on this browser'}
      >
        <Unlock size={10} /> may sleep
      </span>
    );
  }
  return null;
}

function CompletionView({
  sessionId,
  listName,
  resolved,
  itemsById,
  onCancel,
  onSaved,
}: {
  sessionId: string;
  listName: string;
  resolved: ShoppingResolvedItem[];
  itemsById: Map<string, ShoppingItem>;
  onCancel: () => void;
  onSaved: (sessionId: string) => void;
}) {
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const checkedCount = resolved.filter((r) => r.checked).length;

  const onPickFiles = () => inputRef.current?.click();

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const created = await Promise.all(files.map((f) => addPhoto(f)));
    setPhotoIds((prev) => [...prev, ...created.map((p) => p.id)]);
  };

  const removePhoto = async (pid: string) => {
    setPhotoIds((prev) => prev.filter((p) => p !== pid));
    await deletePhoto(pid);
  };

  const onSave = async () => {
    setBusy(true);
    try {
      // Stamp the in-progress row as completed and attach photos/notes.
      await updateShoppingSession(sessionId, {
        completedAt: Date.now(),
        resolvedItems: resolved,
        photoIds,
        notes: notes.trim() || undefined,
      });
      onSaved(sessionId);
    } finally {
      setBusy(false);
    }
  };

  const onCancelClean = async () => {
    if (photoIds.length > 0) {
      const ok = confirm('Discard the photos you attached?');
      if (!ok) return;
      await Promise.all(photoIds.map((p) => deletePhoto(p)));
    }
    onCancel();
  };

  return (
    <div>
      <button
        type="button"
        onClick={onCancelClean}
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> Back to checklist
      </button>
      <PageHeader
        title="Wrap up"
        subtitle={`${checkedCount} of ${resolved.length} checked off · ${listName}`}
      />

      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Photos ({photoIds.length})</div>
          <button type="button" className="btn-secondary" onClick={onPickFiles}>
            <Camera size={14} /> Add
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={onFiles}
          />
        </div>
        {photoIds.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">
            Optional. Add a haul photo, a receipt, anything.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photoIds.map((pid) => (
              <li key={pid} className="relative">
                <button
                  type="button"
                  onClick={() => setPreviewing(pid)}
                  className="block w-full overflow-hidden rounded-xl"
                  aria-label="Preview photo"
                >
                  <Thumbnail photoId={pid} size={96} className="!h-24 !w-full" />
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(pid)}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink-900/80 text-ink-50"
                  aria-label="Remove photo"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-4 space-y-3 p-5">
        <label className="label" htmlFor="run-notes">Notes (optional)</label>
        <textarea
          id="run-notes"
          className="input min-h-[80px] resize-y"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Got most of it; out of romaine."
        />
      </section>

      <section className="card mt-4 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Eye size={16} className="text-ink-500" />
          <div className="text-sm font-medium">Final state</div>
        </div>
        <ul className="space-y-1 text-sm">
          {resolved.map((r) => {
            const item = itemsById.get(r.itemId);
            return (
              <li
                key={r.itemId}
                className={['flex items-center gap-2', r.checked ? '' : 'text-ink-400'].join(' ')}
              >
                <span aria-hidden>{r.checked ? '✓' : '·'}</span>
                <span className={['flex-1 truncate', r.checked ? '' : 'line-through'].join(' ')}>
                  {item?.name ?? '—'}
                </span>
                <span className="text-xs text-ink-500">×{formatQty(r.qty)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6 flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={onCancelClean} disabled={busy}>
          Back
        </button>
        <button type="button" className="btn-primary flex-1" onClick={onSave} disabled={busy}>
          Save session
        </button>
      </div>

      <PhotoLightbox photoId={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}

function PhotoLightbox({ photoId, onClose }: { photoId: string | null; onClose: () => void }) {
  return (
    <Modal open={!!photoId} onClose={onClose} title="Photo">
      {photoId && (
        <div className="flex justify-center">
          <Thumbnail photoId={photoId} size={320} className="!h-auto !w-full max-w-md" />
        </div>
      )}
    </Modal>
  );
}
