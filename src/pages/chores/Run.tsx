import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronUp, ChevronDown, Camera, Eye, Lock, Unlock, X, Check, RotateCcw } from 'lucide-react';
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

type BootInfo = { sessionId: string; snapshotName: string; startedAt: number };

export function ChoreRun() {
  const { id } = useParams();
  const list = useChoreList(id);
  const items = useChoreItems();
  const routines = useChoreRoutines();
  const navigate = useNavigate();
  const toast = useToast();

  const [boot, setBoot] = useState<BootInfo | null>(null);
  const [resolved, setResolved] = useState<ChoreResolvedItem[] | null>(null);
  const [mode, setMode] = useState<'running' | 'completing'>('running');

  const itemsById = useMemo(() => { const m = new Map<string, ChoreItem>(); items?.forEach((i) => m.set(i.id, i)); return m; }, [items]);

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

  const wakeLock = useWakeLock(true);

  if (!boot || !resolved) {
    return <div><Link to="/chores/lists" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"><ChevronLeft size={16} /> Lists</Link><p className="text-sm text-ink-500">Preparing…</p></div>;
  }

  const persist = (next: ChoreResolvedItem[]) => {
    setResolved(next);
    void updateChoreSession(boot.sessionId, { resolvedItems: next });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= resolved.length) return;
    const out = resolved.slice();
    const [m] = out.splice(idx, 1);
    out.splice(next, 0, m);
    persist(out);
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

  if (mode === 'completing') {
    return (
      <CompletionView sessionId={boot.sessionId} listName={boot.snapshotName} resolved={resolved} itemsById={itemsById}
        onCancel={() => setMode('running')}
        onSaved={(savedId) => { toast.show('Session saved'); navigate(`/chores/history/${savedId}`); }} />
    );
  }

  return (
    <div>
      <Link to="/chores/lists" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50">
        <ChevronLeft size={16} /> Lists
      </Link>
      <PageHeader
        title={boot.snapshotName}
        subtitle={<span className="inline-flex items-center gap-2"><span>{checkedCount} of {total} checked</span><WakeLockBadge state={wakeLock} /></span>}
        action={
          <div className="flex gap-1.5">
            <button type="button" className="btn-ghost h-9 px-2" onClick={onRestart} aria-label="Restart run" title="Restart run"><RotateCcw size={16} /></button>
            <button type="button" className="btn-primary" onClick={() => setMode('completing')} disabled={total === 0 && checkedCount === 0}><Check size={16} /> Done</button>
          </div>
        }
      />

      {total === 0 ? (
        <EmptyState title="Nothing to do" description="This list is empty, or every chore has been deleted from your library."
          action={<button type="button" className="btn-primary" onClick={() => setMode('completing')}>Wrap up anyway</button>} />
      ) : (
        <ul className="space-y-2">
          {resolved.map((r, idx) => {
            const item = itemsById.get(r.itemId);
            return (
              <li key={`${r.itemId}-${idx}`}>
                <button type="button" onClick={() => toggle(idx)}
                  className={['flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition', r.checked ? 'border-ink-200/60 bg-ink-50 text-ink-400 dark:border-ink-800/60 dark:bg-ink-900/40 dark:text-ink-500' : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900'].join(' ')}>
                  <span className={['grid h-7 w-7 shrink-0 place-items-center rounded-full border-2', r.checked ? 'border-ink-900 bg-ink-900 text-ink-50 dark:border-ink-50 dark:bg-ink-50 dark:text-ink-900' : 'border-ink-300 dark:border-ink-600'].join(' ')} aria-hidden>{r.checked && <Check size={14} />}</span>
                  <Thumbnail photoId={item?.photoId} size={40} />
                  <span className={['min-w-0 flex-1 truncate text-base', r.checked ? 'line-through' : ''].join(' ')}>{item?.name ?? <em className="text-ink-400">deleted item</em>}</span>
                </button>
                <div className="mt-1 flex justify-end gap-1">
                  <button type="button" aria-label="Move up" onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"><ChevronUp size={16} /></button>
                  <button type="button" aria-label="Move down" onClick={() => move(idx, 1)} disabled={idx === total - 1} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"><ChevronDown size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {allChecked && <div className="sticky bottom-4 mt-6"><button type="button" className="btn-primary w-full shadow-lg" onClick={() => setMode('completing')}><Check size={16} /> Wrap up</button></div>}
    </div>
  );
}

function WakeLockBadge({ state }: { state: ReturnType<typeof useWakeLock> }) {
  if (state.status === 'active') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><Lock size={10} /> screen on</span>;
  if (state.status === 'unsupported' || state.status === 'error') return <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-500 dark:bg-ink-800 dark:text-ink-400" title={state.status === 'error' ? state.message : 'Wake lock not supported on this browser'}><Unlock size={10} /> may sleep</span>;
  return null;
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
