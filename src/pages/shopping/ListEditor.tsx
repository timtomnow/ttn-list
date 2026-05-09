import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronUp, ChevronDown, Trash2, Plus, Search, X, Sparkles, Play } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/Toast';
import {
  createShoppingList,
  updateShoppingList,
  useShoppingGroups,
  useShoppingItems,
  useShoppingList,
} from '@/db/repo';
import type { ShoppingItem, ShoppingGroup, ShoppingListEntry } from '@/types';
import { formatQty, moveEntry, resolveShoppingList } from '@/lib/shopping';
import { useDeadLinkBail } from '@/hooks/useDeadLinkBail';

export function ShoppingListEditor() {
  const { id } = useParams();
  const isNew = !id;
  const existing = useShoppingList(isNew ? null : id);
  const items = useShoppingItems();
  const groups = useShoppingGroups();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<ShoppingListEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [picker, setPicker] = useState<'item' | 'group' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) { setHydrated(true); return; }
    if (existing && !hydrated) {
      setName(existing.name);
      setNotes(existing.notes ?? '');
      setEntries(existing.entries);
      setHydrated(true);
    }
  }, [existing, hydrated, isNew]);

  // Dead-link handling: a reminder may deep-link to a deleted list. After a
  // brief grace period (so the live query has time to resolve), bail to the
  // shopping home with a friendly toast.
  const dead = useDeadLinkBail(existing, !isNew && !hydrated);
  useEffect(() => {
    if (!dead) return;
    toast.show('That list no longer exists', 'error');
    navigate('/shopping/lists', { replace: true });
  }, [dead, navigate, toast]);

  const itemsById = useMemo(() => {
    const m = new Map<string, ShoppingItem>();
    items?.forEach((i) => m.set(i.id, i));
    return m;
  }, [items]);
  const groupsById = useMemo(() => {
    const m = new Map<string, ShoppingGroup>();
    groups?.forEach((g) => m.set(g.id, g));
    return m;
  }, [groups]);

  const sortedItems = useMemo(
    () => items?.slice().sort((a, b) => a.order - b.order) ?? [],
    [items],
  );
  const sortedGroups = useMemo(
    () => groups?.slice().sort((a, b) => a.order - b.order) ?? [],
    [groups],
  );

  // Used itemIds across all 'item' entries — for picker filtering. Group
  // members aren't excluded since the same item can appear via a group AND
  // as a free item; quantities just sum.
  const usedFreeItemIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) if (e.kind === 'item') s.add(e.itemId);
    return s;
  }, [entries]);
  const usedGroupIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) if (e.kind === 'group') s.add(e.groupId);
    return s;
  }, [entries]);

  const move = (idx: number, dir: -1 | 1) => setEntries((prev) => moveEntry(prev, idx, dir));
  const remove = (idx: number) => setEntries((prev) => prev.filter((_, i) => i !== idx));

  const setEntryQty = (idx: number, qty: number) =>
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, qty } : e)));

  const toggleExclusion = (idx: number, itemId: string) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== idx || e.kind !== 'group') return e;
        const cur = new Set(e.excludedItemIds ?? []);
        if (cur.has(itemId)) cur.delete(itemId);
        else cur.add(itemId);
        const arr = [...cur];
        return { ...e, excludedItemIds: arr.length ? arr : undefined };
      }),
    );
  };

  const addItems = (ids: string[]) => {
    setEntries((prev) => [
      ...prev,
      ...ids.map<ShoppingListEntry>((itemId) => ({ kind: 'item', itemId, qty: 1 })),
    ]);
    setPicker(null);
  };
  const addGroups = (ids: string[]) => {
    setEntries((prev) => [
      ...prev,
      ...ids.map<ShoppingListEntry>((groupId) => ({ kind: 'group', groupId, qty: 1 })),
    ]);
    setPicker(null);
  };

  const onSave = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (isNew) {
        const created = await createShoppingList({
          name: name.trim(),
          notes: notes.trim() || undefined,
          entries,
        });
        toast.show('List created');
        navigate(`/shopping/lists/${created.id}`, { replace: true });
      } else {
        if (!id) return;
        await updateShoppingList(id, {
          name: name.trim(),
          notes: notes.trim() || undefined,
          entries,
        });
        toast.show('Saved');
      }
    } finally {
      setBusy(false);
    }
  };

  // Build the resolved preview from a synthetic ShoppingList (we may not
  // have saved yet). The resolver only reads `entries`.
  const previewList = useMemo(
    () => ({
      id: id ?? 'preview',
      name,
      entries,
      order: 0,
      createdAt: 0,
      updatedAt: 0,
    }),
    [id, name, entries],
  );
  const resolved = useMemo(
    () => resolveShoppingList(previewList, items, groups),
    [previewList, items, groups],
  );

  if (!isNew && !existing && !hydrated) {
    return (
      <div>
        <Link to="/shopping/lists" className="text-sm text-ink-500">
          <ChevronLeft size={14} /> Lists
        </Link>
        <p className="mt-4 text-sm text-ink-500">Loading…</p>
      </div>
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
        title={isNew ? 'New list' : 'Edit list'}
        subtitle="Mix items and groups. Order is preserved into Shop it mode."
        action={
          !isNew && id ? (
            <Link to={`/shopping/lists/${id}/run`} className="btn-secondary">
              <Play size={16} /> Shop it
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-5">
        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="list-name">Name</label>
            <input
              id="list-name"
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly groceries"
            />
          </div>
          <div>
            <label className="label" htmlFor="list-notes">Notes (optional)</label>
            <textarea
              id="list-notes"
              className="input mt-1 min-h-[64px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Entries ({entries.length})</div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPicker('item')}
                disabled={!items}
              >
                <Plus size={14} /> Item
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPicker('group')}
                disabled={!groups}
              >
                <Plus size={14} /> Group
              </button>
            </div>
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Empty list — add items or whole groups above.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((e, idx) =>
                e.kind === 'item' ? (
                  <ItemEntry
                    key={`${idx}-${e.itemId}`}
                    entry={e}
                    item={itemsById.get(e.itemId)}
                    canUp={idx > 0}
                    canDown={idx < entries.length - 1}
                    onMove={(d) => move(idx, d)}
                    onRemove={() => remove(idx)}
                    onQty={(q) => setEntryQty(idx, q)}
                  />
                ) : (
                  <GroupEntry
                    key={`${idx}-${e.groupId}`}
                    entry={e}
                    group={groupsById.get(e.groupId)}
                    items={itemsById}
                    canUp={idx > 0}
                    canDown={idx < entries.length - 1}
                    onMove={(d) => move(idx, d)}
                    onRemove={() => remove(idx)}
                    onQty={(q) => setEntryQty(idx, q)}
                    onToggleExclusion={(memberId) => toggleExclusion(idx, memberId)}
                  />
                ),
              )}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-ink-500" />
            <div className="text-sm font-medium">Preview</div>
            <span className="text-xs text-ink-500">
              {resolved.length} {resolved.length === 1 ? 'unique item' : 'unique items'}
            </span>
          </div>
          {resolved.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">
              The resolved item list will appear here once you add entries.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {resolved.map((row) => {
                const item = itemsById.get(row.itemId);
                return (
                  <li key={row.itemId} className="flex items-center gap-3">
                    <Thumbnail photoId={item?.photoId} size={28} />
                    <span className="flex-1 truncate">{item?.name ?? '—'}</span>
                    <span className="text-xs text-ink-500">×{formatQty(row.qty)}</span>
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
            {isNew ? 'Create list' : 'Save changes'}
          </button>
        </div>
      </div>

      <PickItemsModal
        open={picker === 'item'}
        items={sortedItems}
        excludeIds={usedFreeItemIds}
        onClose={() => setPicker(null)}
        onConfirm={addItems}
      />
      <PickGroupsModal
        open={picker === 'group'}
        groups={sortedGroups}
        excludeIds={usedGroupIds}
        onClose={() => setPicker(null)}
        onConfirm={addGroups}
      />
    </div>
  );
}

function ItemEntry({
  entry,
  item,
  canUp,
  canDown,
  onMove,
  onRemove,
  onQty,
}: {
  entry: Extract<ShoppingListEntry, { kind: 'item' }>;
  item: ShoppingItem | undefined;
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onQty: (qty: number) => void;
}) {
  return (
    <li className="rounded-xl border border-ink-200 bg-white p-2 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center gap-3">
        <Thumbnail photoId={item?.photoId} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {item?.name ?? <em className="text-ink-400">deleted item</em>}
          </div>
          <div className="text-xs text-ink-500">item</div>
        </div>
        <input
          type="number"
          min={0.01}
          step="any"
          value={entry.qty}
          onChange={(e) => onQty(Number(e.target.value) || 1)}
          className="input h-9 w-20 text-center"
          aria-label="Quantity"
        />
        <Arrows canUp={canUp} canDown={canDown} onMove={onMove} />
        <RemoveBtn onClick={onRemove} />
      </div>
    </li>
  );
}

function GroupEntry({
  entry,
  group,
  items,
  canUp,
  canDown,
  onMove,
  onRemove,
  onQty,
  onToggleExclusion,
}: {
  entry: Extract<ShoppingListEntry, { kind: 'group' }>;
  group: ShoppingGroup | undefined;
  items: Map<string, ShoppingItem>;
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onQty: (qty: number) => void;
  onToggleExclusion: (memberId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const excluded = new Set(entry.excludedItemIds ?? []);

  return (
    <li className="rounded-xl border-2 border-blue-300 bg-white p-2 dark:border-blue-700 dark:bg-ink-900">
      <div className="flex items-center gap-3">
        <Thumbnail photoId={group?.photoId} size={36} />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-medium">
              {group?.name ?? <em className="text-ink-400">deleted group</em>}
            </span>
            <ChevronDown
              size={14}
              className={['shrink-0 text-ink-400 transition-transform duration-200', expanded ? 'rotate-180' : ''].join(' ')}
            />
          </div>
          <div className="text-xs text-ink-500">
            group · {group ? group.members.length : 0} members
            {excluded.size > 0 && ` · ${excluded.size} excluded`}
          </div>
        </button>
        <input
          type="number"
          min={0.01}
          step="any"
          value={entry.qty}
          onChange={(e) => onQty(Number(e.target.value) || 1)}
          className="input h-9 w-20 text-center"
          aria-label="Group multiplier"
        />
        <Arrows canUp={canUp} canDown={canDown} onMove={onMove} />
        <RemoveBtn onClick={onRemove} />
      </div>
      {expanded && group && (
        <div className="mt-3 border-t border-ink-100 pt-3 dark:border-ink-800">
          <div className="mb-1.5 text-xs text-ink-500">
            Tap to toggle. Excluded members are skipped on this list only.
          </div>
          <ul className="space-y-1">
            {group.members.map((m) => {
              const item = items.get(m.itemId);
              const isExcluded = excluded.has(m.itemId);
              return (
                <li key={m.itemId}>
                  <button
                    type="button"
                    onClick={() => onToggleExclusion(m.itemId)}
                    className={[
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
                      isExcluded
                        ? 'text-ink-400 line-through'
                        : 'hover:bg-ink-50 dark:hover:bg-ink-800/60',
                    ].join(' ')}
                  >
                    <Thumbnail photoId={item?.photoId} size={24} />
                    <span className="flex-1 truncate">{item?.name ?? '—'}</span>
                    <span className="text-xs">×{formatQty(m.defaultQty)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

function Arrows({ canUp, canDown, onMove }: { canUp: boolean; canDown: boolean; onMove: (d: -1 | 1) => void }) {
  return (
    <>
      <button
        type="button"
        aria-label="Move up"
        disabled={!canUp}
        onClick={() => onMove(-1)}
        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:text-ink-400 dark:hover:bg-ink-800"
      >
        <ChevronUp size={16} />
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={!canDown}
        onClick={() => onMove(1)}
        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:text-ink-400 dark:hover:bg-ink-800"
      >
        <ChevronDown size={16} />
      </button>
    </>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Remove"
      onClick={onClick}
      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
    >
      <Trash2 size={16} />
    </button>
  );
}

function PickItemsModal({
  open,
  items,
  excludeIds,
  onClose,
  onConfirm,
}: {
  open: boolean;
  items: ShoppingItem[];
  excludeIds: Set<string>;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) { setPicked(new Set()); setQuery(''); } }, [open]);
  const available = useMemo(() => items.filter((i) => !excludeIds.has(i.id)), [items, excludeIds]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? available.filter((i) => i.name.toLowerCase().includes(q)) : available;
  }, [available, query]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add items"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
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
      {available.length === 0 ? (
        <EmptyState
          title="Nothing to add"
          description="Either you've already added every item, or your library is empty."
        />
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Search items" value={query} onChange={(e) => setQuery(e.target.value)} />
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
            {filtered.map((i) => (
              <PickRow
                key={i.id}
                photoId={i.photoId}
                name={i.name}
                checked={picked.has(i.id)}
                onClick={() =>
                  setPicked((p) => {
                    const n = new Set(p);
                    if (n.has(i.id)) n.delete(i.id); else n.add(i.id);
                    return n;
                  })
                }
              />
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function PickGroupsModal({
  open,
  groups,
  excludeIds,
  onClose,
  onConfirm,
}: {
  open: boolean;
  groups: ShoppingGroup[];
  excludeIds: Set<string>;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) { setPicked(new Set()); setQuery(''); } }, [open]);
  const available = useMemo(() => groups.filter((g) => !excludeIds.has(g.id)), [groups, excludeIds]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? available.filter((g) => g.name.toLowerCase().includes(q)) : available;
  }, [available, query]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add groups"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
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
      {available.length === 0 ? (
        <EmptyState
          title="Nothing to add"
          description="Either you've already added every group, or your library is empty."
        />
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Search groups" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <ul className="max-h-72 space-y-1 overflow-auto">
            {filtered.map((g) => (
              <PickRow
                key={g.id}
                photoId={g.photoId}
                name={g.name}
                subtitle={`${g.members.length} member${g.members.length === 1 ? '' : 's'}`}
                checked={picked.has(g.id)}
                onClick={() =>
                  setPicked((p) => {
                    const n = new Set(p);
                    if (n.has(g.id)) n.delete(g.id); else n.add(g.id);
                    return n;
                  })
                }
              />
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function PickRow({
  photoId,
  name,
  subtitle,
  checked,
  onClick,
}: {
  photoId: string | undefined;
  name: string;
  subtitle?: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          'flex w-full items-center gap-3 rounded-xl border p-2 text-left transition',
          checked
            ? 'border-ink-900 bg-ink-900/5 dark:border-ink-50 dark:bg-ink-50/5'
            : 'border-ink-200 hover:border-ink-300 dark:border-ink-800 dark:hover:border-ink-700',
        ].join(' ')}
      >
        <Thumbnail photoId={photoId} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{name}</div>
          {subtitle && <div className="truncate text-xs text-ink-500">{subtitle}</div>}
        </div>
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
}
