import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, Package } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { PhotoPicker } from '@/components/inputs/PhotoPicker';
import { useToast } from '@/components/ui/Toast';
import {
  createChoreItem,
  updateChoreItem,
  deleteChoreItem,
  deletePhoto,
  reorderChoreItem,
  useChoreItems,
} from '@/db/repo';
import type { ChoreItem } from '@/types';

type DraftItem = { name: string; notes: string; photoId: string | undefined };
const EMPTY_DRAFT: DraftItem = { name: '', notes: '', photoId: undefined };

export function ChoreItems() {
  const items = useChoreItems();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ChoreItem | null>(null);
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(() => items?.slice().sort((a, b) => a.order - b.order) ?? [], [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((i) => i.name.toLowerCase().includes(q)) : sorted;
  }, [sorted, query]);

  const onMove = async (item: ChoreItem, dir: -1 | 1) => {
    const idx = sorted.findIndex((i) => i.id === item.id);
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    await reorderChoreItem(item.id, next);
  };

  const onDelete = async (item: ChoreItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await deleteChoreItem(item.id);
    if (item.photoId) await deletePhoto(item.photoId);
    toast.show('Deleted');
  };

  return (
    <div>
      <Link to="/chores" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50">
        <ChevronLeft size={16} /> Chores
      </Link>
      <PageHeader
        title="Items"
        subtitle={`${sorted.length} in library`}
        action={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> New
          </button>
        }
      />

      {sorted.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search items" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title="No chores yet"
          description="Add reusable chores here, then drop them into a list."
          action={
            <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> Add a chore
            </button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const trueIdx = sorted.findIndex((s) => s.id === item.id);
            const canUp = trueIdx > 0;
            const canDown = trueIdx < sorted.length - 1;
            const queryActive = query.trim().length > 0;
            return (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
                <Thumbnail photoId={item.photoId} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.name}</div>
                  {item.notes && <div className="truncate text-xs text-ink-500 dark:text-ink-400">{item.notes}</div>}
                </div>
                <div className="flex items-center gap-1">
                  {!queryActive && (
                    <>
                      <IconBtn label="Move up" onClick={() => onMove(item, -1)} disabled={!canUp}><ChevronUp size={16} /></IconBtn>
                      <IconBtn label="Move down" onClick={() => onMove(item, 1)} disabled={!canDown}><ChevronDown size={16} /></IconBtn>
                    </>
                  )}
                  <IconBtn label="Edit" onClick={() => setEditing(item)}><Pencil size={16} /></IconBtn>
                  <IconBtn label="Delete" onClick={() => onDelete(item)} tone="danger"><Trash2 size={16} /></IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ItemFormModal
        open={creating}
        title="New chore"
        initial={EMPTY_DRAFT}
        onClose={() => setCreating(false)}
        onSubmit={async (draft) => {
          await createChoreItem({ name: draft.name.trim(), notes: draft.notes.trim() || undefined, photoId: draft.photoId });
          setCreating(false);
          toast.show('Added');
        }}
      />
      <ItemFormModal
        open={!!editing}
        title="Edit chore"
        initial={editing ? { name: editing.name, notes: editing.notes ?? '', photoId: editing.photoId } : EMPTY_DRAFT}
        onClose={() => setEditing(null)}
        onSubmit={async (draft) => {
          if (!editing) return;
          await updateChoreItem(editing.id, { name: draft.name.trim(), notes: draft.notes.trim() || undefined, photoId: draft.photoId });
          setEditing(null);
          toast.show('Saved');
        }}
      />
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, tone }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; tone?: 'danger' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className={['rounded-lg p-2 transition disabled:opacity-30', tone === 'danger' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'].join(' ')}>
      {children}
    </button>
  );
}

function ItemFormModal({ open, title, initial, onClose, onSubmit }: { open: boolean; title: string; initial: DraftItem; onClose: () => void; onSubmit: (d: DraftItem) => Promise<void> }) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setDraft(initial); }, [open]);
  const canSave = draft.name.trim().length > 0 && !busy;

  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={title}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" disabled={!canSave} onClick={async () => { setBusy(true); try { await onSubmit(draft); } finally { setBusy(false); } }}>Save</button>
        </>
      }>
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="ci-name">Name</label>
          <input id="ci-name" className="input mt-1" autoFocus value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Wipe counter" />
        </div>
        <div>
          <label className="label" htmlFor="ci-notes">Notes (optional)</label>
          <textarea id="ci-notes" className="input mt-1 min-h-[64px] resize-y" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
        </div>
        <div>
          <span className="label">Photo (optional)</span>
          <div className="mt-1">
            <PhotoPicker photoId={draft.photoId} onChange={(photoId) => setDraft((d) => ({ ...d, photoId }))} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
