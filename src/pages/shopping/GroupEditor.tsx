import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { PhotoPicker } from '@/components/inputs/PhotoPicker';
import { useToast } from '@/components/ui/Toast';
import {
  createShoppingGroup,
  updateShoppingGroup,
  useShoppingGroup,
  useShoppingItems,
} from '@/db/repo';
import type { ShoppingGroupMember } from '@/types';

export function ShoppingGroupEditor() {
  const { id } = useParams();
  const isNew = !id;
  const existing = useShoppingGroup(isNew ? null : id);
  const items = useShoppingItems();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [photoId, setPhotoId] = useState<string | undefined>(undefined);
  const [members, setMembers] = useState<ShoppingGroupMember[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hydrate from the loaded group exactly once.
  useEffect(() => {
    if (isNew) { setHydrated(true); return; }
    if (existing && !hydrated) {
      setName(existing.name);
      setNotes(existing.notes ?? '');
      setPhotoId(existing.photoId);
      setMembers(existing.members);
      setHydrated(true);
    }
  }, [existing, hydrated, isNew]);

  const itemsById = useMemo(() => {
    const m = new Map<string, { id: string; name: string; photoId?: string }>();
    items?.forEach((i) => m.set(i.id, i));
    return m;
  }, [items]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.itemId)), [members]);
  const sortedItems = useMemo(
    () => items?.slice().sort((a, b) => a.order - b.order) ?? [],
    [items],
  );

  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= members.length) return;
    setMembers((prev) => {
      const out = prev.slice();
      const [m] = out.splice(idx, 1);
      out.splice(next, 0, m);
      return out;
    });
  };

  const setQty = (idx: number, qty: number) => {
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, defaultQty: qty } : m)));
  };

  const removeMember = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMembers = (ids: string[]) => {
    setMembers((prev) => [...prev, ...ids.map((itemId) => ({ itemId, defaultQty: 1 }))]);
    setPicking(false);
  };

  const onSave = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (isNew) {
        await createShoppingGroup({
          name: name.trim(),
          notes: notes.trim() || undefined,
          photoId,
          members,
        });
        toast.show('Group created');
      } else {
        if (!id) return;
        await updateShoppingGroup(id, {
          name: name.trim(),
          notes: notes.trim() || undefined,
          photoId,
          members,
        });
        toast.show('Saved');
      }
      navigate('/shopping/groups');
    } finally {
      setBusy(false);
    }
  };

  if (!isNew && !existing && hydrated === false) {
    return (
      <div>
        <Link to="/shopping/groups" className="text-sm text-ink-500">
          <ChevronLeft size={14} /> Groups
        </Link>
        <p className="mt-4 text-sm text-ink-500">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/shopping/groups"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> Groups
      </Link>
      <PageHeader
        title={isNew ? 'New group' : 'Edit group'}
        subtitle="A group bundles items. Add it to a list in one tap."
      />

      <div className="space-y-5">
        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="group-name">Name</label>
            <input
              id="group-name"
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Taco Tuesday"
            />
          </div>
          <div>
            <label className="label" htmlFor="group-notes">Notes (optional)</label>
            <textarea
              id="group-notes"
              className="input mt-1 min-h-[64px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <span className="label">Photo (optional)</span>
            <div className="mt-1">
              <PhotoPicker photoId={photoId} onChange={setPhotoId} />
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Members ({members.length})</div>
            <button type="button" className="btn-secondary" onClick={() => setPicking(true)}>
              <Plus size={14} /> Add items
            </button>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">
              No items yet. Add some from your library.
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((m, idx) => {
                const item = itemsById.get(m.itemId);
                const canUp = idx > 0;
                const canDown = idx < members.length - 1;
                return (
                  <li
                    key={`${m.itemId}-${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-2 dark:border-ink-800 dark:bg-ink-900"
                  >
                    <Thumbnail photoId={item?.photoId} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {item?.name ?? <em className="text-ink-400">deleted item</em>}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={m.defaultQty}
                      onChange={(e) => setQty(idx, Number(e.target.value) || 1)}
                      className="input h-9 w-20 text-center"
                      aria-label="Default quantity"
                    />
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={!canUp}
                      aria-label="Move up"
                      className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:text-ink-400 dark:hover:bg-ink-800"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={!canDown}
                      aria-label="Move down"
                      className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:text-ink-400 dark:hover:bg-ink-800"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMember(idx)}
                      aria-label="Remove"
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!name.trim() || busy}
            onClick={onSave}
          >
            {isNew ? 'Create group' : 'Save changes'}
          </button>
        </div>
      </div>

      <ItemPickerModal
        open={picking}
        onClose={() => setPicking(false)}
        onConfirm={addMembers}
        excludeIds={memberIds}
        items={sortedItems}
      />
    </div>
  );
}

function ItemPickerModal({
  open,
  onClose,
  onConfirm,
  excludeIds,
  items,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  excludeIds: Set<string>;
  items: { id: string; name: string; photoId?: string }[];
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setPicked(new Set());
      setQuery('');
    }
  }, [open]);

  const available = useMemo(() => items.filter((i) => !excludeIds.has(i.id)), [items, excludeIds]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? available.filter((i) => i.name.toLowerCase().includes(q)) : available;
  }, [available, query]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add items"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={picked.size === 0}
            onClick={() => onConfirm([...picked])}
          >
            Add {picked.size > 0 && `(${picked.size})`}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {available.length === 0 ? (
          <p className="text-sm text-ink-500">
            No items available. <Link to="/shopping/items" className="underline">Create some first.</Link>
          </p>
        ) : (
          <>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                className="input pl-9"
                placeholder="Search items"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
                  aria-label="Clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <ul className="max-h-72 space-y-1 overflow-auto">
              {filtered.map((i) => {
                const checked = picked.has(i.id);
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => toggle(i.id)}
                      className={[
                        'flex w-full items-center gap-3 rounded-xl border p-2 text-left transition',
                        checked
                          ? 'border-ink-900 bg-ink-900/5 dark:border-ink-50 dark:bg-ink-50/5'
                          : 'border-ink-200 hover:border-ink-300 dark:border-ink-800 dark:hover:border-ink-700',
                      ].join(' ')}
                    >
                      <Thumbnail photoId={i.photoId} size={36} />
                      <span className="flex-1 truncate text-sm font-medium">{i.name}</span>
                      <span
                        className={[
                          'grid h-5 w-5 place-items-center rounded-md border',
                          checked
                            ? 'border-ink-900 bg-ink-900 text-ink-50 dark:border-ink-50 dark:bg-ink-50 dark:text-ink-900'
                            : 'border-ink-300 dark:border-ink-700',
                        ].join(' ')}
                        aria-hidden
                      >
                        {checked ? '✓' : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}
