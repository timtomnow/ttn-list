import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Camera,
  Eye,
  X,
  Check,
  RotateCcw,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/Toast';
import {
  addPhoto,
  createChoreSession,
  deletePhoto,
  deleteChoreSession,
  findInProgressChoreSession,
  updateChoreSession,
  useChoreItems,
  useChoreList,
  useChoreRoutines,
} from '@/db/repo';
import type { ChoreItem, ChoreResolvedItem } from '@/types';
import { resolveChoreList, seedResolvedChoreItems } from '@/lib/chores';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useRunPrefs, type RunPrefs } from '@/hooks/useRunPrefs';

type BootInfo = { sessionId: string; snapshotName: string; startedAt: number };

export function ChoreRun() {
  const { id } = useParams();
  const list = useChoreList(id);
  const items = useChoreItems();
  const routines = useChoreRoutines();
  const navigate = useNavigate();
  const toast = useToast();
  const { prefs, setPrefs } = useRunPrefs();

  const [boot, setBoot] = useState<BootInfo | null>(null);
  const [resolved, setResolved] = useState<ChoreResolvedItem[] | null>(null);
  const [mode, setMode] = useState<'running' | 'completing'>('running');
  const [previewing, setPreviewing] = useState<string | null>(null);

  const itemsById = useMemo(() => { const m = new Map<string, ChoreItem>(); items?.forEach((i) => m.set(i.id, i)); return m; }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (boot) return;
    if (!id) return;
    let cancelled = false;
    (async () => {
      const existing = await findInProgressChoreSession(id);
      if (cancelled) return;
      if (existing) {
        setResolved(existing.resolvedItems);
        setBoot({ sessionId: existing.id, snapshotName: existing.listName, startedAt: existing.startedAt });
        return;
      }
      if (!list || !items || !routines) return;
      const rows = resolveChoreList(list, items, routines);
      const seeded = seedResolvedChoreItems(rows);
      const startedAt = Date.now();
      const session = await createChoreSession({
        listId: id,
        listName: list.name,
        startedAt,
        resolvedItems: seeded,
        photoIds: [],
      });
      if (cancelled) return;
      setResolved(seeded);
      setBoot({ sessionId: session.id, snapshotName: list.name, startedAt });
    })();
    return () => { cancelled = true; };
  }, [id, list, items, routines, boot]);

  useWakeLock(true);

  if (!boot || !resolved) {
    return (
      <div>
        <Link
          to="/chores/lists"
          className="inline-flex items-center rounded-lg p-1 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
        >
          <ChevronLeft size={22} />
        </Link>
        <p className="mt-3 text-sm text-ink-500">Preparing…</p>
      </div>
    );
  }

  const persist = (next: ChoreResolvedItem[]) => {
    setResolved(next);
    void updateChoreSession(boot.sessionId, { resolvedItems: next });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = Number(String(active.id).replace('ci-', ''));
    const newIdx = Number(String(over.id).replace('ci-', ''));
    if (!isNaN(oldIdx) && !isNaN(newIdx)) persist(arrayMove(resolved, oldIdx, newIdx));
  };

  const toggle = (idx: number) => persist(resolved.map((r, i) => (i === idx ? { ...r, checked: !r.checked } : r)));

  const onRestart = async () => {
    if (!list || !items || !routines || !id) { toast.show('Cannot restart — libraries not loaded yet', 'error'); return; }
    if (!confirm('Discard this run and start over?')) return;
    await deleteChoreSession(boot.sessionId);
    const rows = resolveChoreList(list, items, routines);
    const seeded = seedResolvedChoreItems(rows);
    const startedAt = Date.now();
    const session = await createChoreSession({ listId: id, listName: list.name, startedAt, resolvedItems: seeded, photoIds: [] });
    setResolved(seeded);
    setBoot({ sessionId: session.id, snapshotName: list.name, startedAt });
    toast.show('Restarted');
  };

  const checkedCount = resolved.filter((r) => r.checked).length;
  const total = resolved.length;
  const allChecked = total > 0 && checkedCount === total;

  const isTwoCol = prefs.density === 'condensed' && prefs.fontSize === 'small';
  const isCondensed = prefs.density === 'condensed';
  const showCheckmark = !(isCondensed && prefs.fontSize === 'small');

  if (mode === 'completing') {
    return (
      <CompletionView sessionId={boot.sessionId} listName={boot.snapshotName} resolved={resolved} itemsById={itemsById}
        onCancel={() => setMode('running')}
        onSaved={(savedId) => { toast.show('Session saved'); navigate(`/chores/history/${savedId}`); }} />
    );
  }

  return (
    <div>
      <header className="mb-4 flex items-center gap-2">
        <Link
          to="/chores/lists"
          className="shrink-0 rounded-lg p-1 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
        >
          <ChevronLeft size={22} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{boot.snapshotName}</h1>
          <p className="inline-flex items-center gap-1 text-sm text-ink-500 dark:text-ink-400">
            {checkedCount} of {total} <Check size={13} />
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" className="btn-ghost h-9 px-2" onClick={onRestart} aria-label="Restart run" title="Restart run">
            <RotateCcw size={16} />
          </button>
          <button type="button" className="btn-primary" onClick={() => setMode('completing')} disabled={total === 0 && checkedCount === 0}>
            <Check size={16} /> Done
          </button>
        </div>
      </header>

      {total === 0 ? (
        <EmptyState title="Nothing to do" description="This list is empty, or every chore has been deleted from your library."
          action={<button type="button" className="btn-primary" onClick={() => setMode('completing')}>Wrap up anyway</button>} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={resolved.map((_, idx) => `ci-${idx}`)}
            strategy={isTwoCol ? rectSortingStrategy : verticalListSortingStrategy}
          >
            <ul className={isTwoCol ? 'grid grid-cols-2 gap-1' : isCondensed ? 'space-y-1' : 'space-y-2'}>
              {resolved.map((r, idx) => (
                <SortableChoreItem
                  key={`ci-${idx}`}
                  id={`ci-${idx}`}
                  r={r}
                  item={itemsById.get(r.itemId)}
                  isCondensed={isCondensed}
                  isTwoCol={isTwoCol}
                  showCheckmark={showCheckmark}
                  prefs={prefs}
                  onToggle={() => toggle(idx)}
                  onPreviewPhoto={(photoId) => setPreviewing(photoId)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {allChecked && (
        <div className="mt-4">
          <button type="button" className="btn-primary w-full shadow-lg" onClick={() => setMode('completing')}>
            <Check size={16} /> Wrap up
          </button>
        </div>
      )}

      <RunPrefsToolbar prefs={prefs} onSetPrefs={setPrefs} />
      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title="Photo">
        {previewing && <div className="flex justify-center"><Thumbnail photoId={previewing} size={320} className="!h-auto !w-full max-w-md" /></div>}
      </Modal>
    </div>
  );
}

function SortableChoreItem({
  id,
  r,
  item,
  isCondensed,
  isTwoCol,
  showCheckmark,
  prefs,
  onToggle,
  onPreviewPhoto,
}: {
  id: string;
  r: ChoreResolvedItem;
  item: ChoreItem | undefined;
  isCondensed: boolean;
  isTwoCol: boolean;
  showCheckmark: boolean;
  prefs: RunPrefs;
  onToggle: () => void;
  onPreviewPhoto: (photoId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  const fontClass = prefs.fontSize === 'small' ? 'text-sm' : prefs.fontSize === 'large' ? 'text-lg' : 'text-base';

  const liClass = [
    'border',
    isTwoCol ? 'rounded-xl' : isCondensed ? 'rounded-xl' : 'rounded-2xl',
    r.checked
      ? 'border-ink-200/60 bg-ink-50 text-ink-400 dark:border-ink-800/60 dark:bg-ink-900/40 dark:text-ink-500'
      : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900',
  ].join(' ');

  if (isTwoCol) {
    return (
      <li ref={setNodeRef} style={style} {...attributes} className={liClass}>
        <div className="flex items-center gap-1 px-1.5 py-1.5">
          <button type="button" {...listeners} className="shrink-0 touch-none cursor-grab text-ink-300 dark:text-ink-700" aria-label="Drag to reorder">
            <GripVertical size={12} />
          </button>
          <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
            <span className={['block truncate text-sm', r.checked ? 'line-through' : ''].join(' ')}>
              {item?.name ?? <em className="text-ink-400">deleted</em>}
            </span>
          </button>
        </div>
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style} {...attributes} className={liClass}>
      <div className={['flex items-center gap-2', isCondensed ? 'px-2 py-1.5' : 'p-3'].join(' ')}>
        <button type="button" {...listeners} className="shrink-0 touch-none cursor-grab text-ink-300 dark:text-ink-600" aria-label="Drag to reorder">
          <GripVertical size={isCondensed ? 14 : 16} />
        </button>
        {showCheckmark && (
          <span className={['grid shrink-0 place-items-center rounded-full border-2', isCondensed ? 'h-5 w-5' : 'h-7 w-7', r.checked ? 'border-ink-900 bg-ink-900 text-ink-50 dark:border-ink-50 dark:bg-ink-50 dark:text-ink-900' : 'border-ink-300 dark:border-ink-600'].join(' ')} aria-hidden>
            {r.checked && <Check size={isCondensed ? 10 : 14} />}
          </span>
        )}
        {item?.photoId ? (
          <button type="button" onClick={() => onPreviewPhoto(item.photoId!)} className="shrink-0 overflow-hidden rounded-xl" aria-label="View photo">
            <Thumbnail photoId={item.photoId} size={isCondensed ? 32 : 40} />
          </button>
        ) : (
          <Thumbnail photoId={undefined} size={isCondensed ? 32 : 40} />
        )}
        <button type="button" onClick={onToggle} className={['min-w-0 flex-1 truncate text-left', fontClass, r.checked ? 'line-through' : ''].join(' ')}>
          {item?.name ?? <em className="text-ink-400">deleted item</em>}
        </button>
      </div>
    </li>
  );
}

function RunPrefsToolbar({ prefs, onSetPrefs }: { prefs: RunPrefs; onSetPrefs: (p: Partial<RunPrefs>) => void }) {
  return (
    <div className="mt-12 flex items-center justify-center gap-3 border-t border-ink-100 pt-5 dark:border-ink-800 md:justify-start">
      <div className="flex items-center gap-1">
        {(['clean', 'condensed'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onSetPrefs({ density: d })}
            aria-pressed={prefs.density === d}
            className={[
              'rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition',
              prefs.density === d
                ? 'bg-ink-900 text-ink-50 dark:bg-ink-50 dark:text-ink-900'
                : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
            ].join(' ')}
          >
            {d === 'condensed' ? 'Dense' : 'Clean'}
          </button>
        ))}
      </div>
      <div className="h-4 w-px bg-ink-200 dark:bg-ink-800" />
      <div className="flex items-center gap-1">
        {([['small', 'text-xs'], ['default', 'text-sm'], ['large', 'text-base']] as const).map(([f, sz]) => (
          <button
            key={f}
            type="button"
            onClick={() => onSetPrefs({ fontSize: f })}
            aria-pressed={prefs.fontSize === f}
            aria-label={`Font size: ${f}`}
            className={[
              sz,
              'rounded-lg px-2 py-1 font-medium transition',
              prefs.fontSize === f
                ? 'bg-ink-900 text-ink-50 dark:bg-ink-50 dark:text-ink-900'
                : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
            ].join(' ')}
          >
            Aa
          </button>
        ))}
      </div>
    </div>
  );
}


function CompletionView({ sessionId, listName, resolved, itemsById, onCancel, onSaved }: { sessionId: string; listName: string; resolved: ChoreResolvedItem[]; itemsById: Map<string, ChoreItem>; onCancel: () => void; onSaved: (sessionId: string) => void }) {
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
  const removePhoto = async (pid: string) => { setPhotoIds((prev) => prev.filter((p) => p !== pid)); await deletePhoto(pid); };

  const onSave = async () => {
    setBusy(true);
    try {
      await updateChoreSession(sessionId, { completedAt: Date.now(), resolvedItems: resolved, photoIds, notes: notes.trim() || undefined });
      onSaved(sessionId);
    } finally { setBusy(false); }
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
      <button type="button" onClick={onCancelClean} className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"><ChevronLeft size={16} /> Back to checklist</button>
      <PageHeader title="Wrap up" subtitle={`${checkedCount} of ${resolved.length} checked off · ${listName}`} />

      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Photos ({photoIds.length})</div>
          <button type="button" className="btn-secondary" onClick={onPickFiles}><Camera size={14} /> Add</button>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onFiles} />
        </div>
        {photoIds.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">Optional. Add a before/after, anything.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photoIds.map((pid) => (
              <li key={pid} className="relative">
                <button type="button" onClick={() => setPreviewing(pid)} className="block w-full overflow-hidden rounded-xl" aria-label="Preview photo"><Thumbnail photoId={pid} size={96} className="!h-24 !w-full" /></button>
                <button type="button" onClick={() => removePhoto(pid)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink-900/80 text-ink-50" aria-label="Remove photo"><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-4 space-y-3 p-5">
        <label className="label" htmlFor="cr-notes">Notes (optional)</label>
        <textarea id="cr-notes" className="input min-h-[80px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mostly done; counters skipped." />
      </section>

      <section className="card mt-4 p-5">
        <div className="mb-2 flex items-center gap-2"><Eye size={16} className="text-ink-500" /><div className="text-sm font-medium">Final state</div></div>
        <ul className="space-y-1 text-sm">
          {resolved.map((r) => {
            const item = itemsById.get(r.itemId);
            return (
              <li key={r.itemId} className={['flex items-center gap-2', r.checked ? '' : 'text-ink-400'].join(' ')}>
                <span aria-hidden>{r.checked ? '✓' : '·'}</span>
                <span className={['flex-1 truncate', r.checked ? '' : 'line-through'].join(' ')}>{item?.name ?? '—'}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6 flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={onCancelClean} disabled={busy}>Back</button>
        <button type="button" className="btn-primary flex-1" onClick={onSave} disabled={busy}>Save session</button>
      </div>

      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title="Photo">
        {previewing && <div className="flex justify-center"><Thumbnail photoId={previewing} size={320} className="!h-auto !w-full max-w-md" /></div>}
      </Modal>
    </div>
  );
}
