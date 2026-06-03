import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Package,
  Tag,
  Sparkles,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { PhotoPicker } from '@/components/inputs/PhotoPicker';
import { TagInput } from '@/components/inputs/TagInput';
import { useToast } from '@/components/ui/Toast';
import {
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  deletePhoto,
  reorderShoppingItem,
  seedStarterShoppingItems,
  useShoppingItems,
} from '@/db/repo';
import { dedupeTags, tagKey, type TagSuggestion } from '@/lib/tags';
import type { ShoppingItem } from '@/types';

type DraftItem = {
  name: string;
  notes: string;
  photoId: string | undefined;
  tags: string[];
};

const EMPTY_DRAFT: DraftItem = { name: '', notes: '', photoId: undefined, tags: [] };

/** Sentinel query value for the "view the full library" card. Tag keys are
 *  lower-cased, so this won't collide with a user-defined tag. */
const ALL_VIEW = '__all__';

export function ShoppingItems() {
  const [params] = useSearchParams();
  const tagParam = params.get('tag');
  // Picker by default. Any tag param (including the all-view sentinel) opens
  // the list.
  if (!tagParam) return <TagPicker />;
  return <ItemList activeTag={tagParam === ALL_VIEW ? null : tagParam} />;
}

// =============================================================================
// Tag picker
// =============================================================================

function TagPicker() {
  const items = useShoppingItems();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const allItems = useMemo(() => items ?? [], [items]);

  const onSeed = async () => {
    setSeeding(true);
    try {
      const added = await seedStarterShoppingItems();
      toast.show(added > 0 ? `Added ${added} starter items` : 'Starter items already in your library');
    } finally {
      setSeeding(false);
    }
  };

  // Tag counts, sorted by count desc then alphabetically. Keys are
  // case-insensitive; we display the first casing we encounter.
  const tagCards = useMemo(() => {
    const counts = new Map<string, { tag: string; count: number }>();
    for (const item of allItems) {
      for (const t of item.tags ?? []) {
        const k = tagKey(t);
        const prev = counts.get(k);
        if (prev) prev.count += 1;
        else counts.set(k, { tag: t, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });
  }, [allItems]);

  return (
    <div>
      <Link
        to="/shopping"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> Shopping
      </Link>
      <PageHeader
        title="Items"
        subtitle={`${allItems.length} in library${tagCards.length > 0 ? ` · ${tagCards.length} tag${tagCards.length === 1 ? '' : 's'}` : ''}`}
        action={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> New
          </button>
        }
      />

      {allItems.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title="No items yet"
          description="Add reusable line items here, then drop them into a list. Or start with a set of common grocery items, already tagged by category."
          action={
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={onSeed}
                disabled={seeding}
              >
                <Sparkles size={16} /> Load starter grocery items
              </button>
              <button type="button" className="btn-ghost" onClick={() => setCreating(true)}>
                <Plus size={16} /> Add one manually
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <PickerCard
            to={`/shopping/items?tag=${ALL_VIEW}`}
            icon={<Package size={22} />}
            title="All Items"
            count={allItems.length}
            emphasized
          />
          {tagCards.map((t) => (
            <PickerCard
              key={tagKey(t.tag)}
              to={`/shopping/items?tag=${encodeURIComponent(t.tag)}`}
              icon={<Tag size={20} />}
              title={t.tag}
              count={t.count}
            />
          ))}
        </div>
      )}

      <ItemFormModal
        open={creating}
        title="New item"
        initial={EMPTY_DRAFT}
        existingItems={allItems}
        onClose={() => setCreating(false)}
        onSubmit={async (draft) => {
          await createShoppingItem({
            name: draft.name.trim(),
            notes: draft.notes.trim() || undefined,
            photoId: draft.photoId,
            tags: draft.tags.length > 0 ? draft.tags : undefined,
          });
          setCreating(false);
          toast.show('Added');
        }}
      />
    </div>
  );
}

function PickerCard({
  to,
  icon,
  title,
  count,
  emphasized,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  emphasized?: boolean;
}) {
  return (
    <Link
      to={to}
      className={[
        'flex aspect-square flex-col justify-between rounded-2xl border p-3 transition',
        emphasized
          ? 'border-ink-900 bg-ink-900 text-ink-50 hover:bg-ink-800 dark:border-ink-50 dark:bg-ink-50 dark:text-ink-900 dark:hover:bg-ink-200'
          : 'border-ink-200 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700',
      ].join(' ')}
    >
      <div
        className={[
          'grid h-9 w-9 place-items-center rounded-xl',
          emphasized
            ? 'bg-ink-700 text-ink-50 dark:bg-ink-300 dark:text-ink-900'
            : 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
        ].join(' ')}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div
          className={[
            'text-xs',
            emphasized ? 'text-ink-300 dark:text-ink-600' : 'text-ink-500 dark:text-ink-400',
          ].join(' ')}
        >
          {count} item{count === 1 ? '' : 's'}
        </div>
      </div>
    </Link>
  );
}

// =============================================================================
// Item list (optionally tag-filtered)
// =============================================================================

function ItemList({ activeTag }: { activeTag: string | null }) {
  const items = useShoppingItems();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const allItems = useMemo(() => items ?? [], [items]);
  const sorted = useMemo(() => allItems.slice().sort((a, b) => a.order - b.order), [allItems]);

  // Resolve the activeTag against existing item tags so we display the user's
  // original casing in the chip, even if the URL was hand-typed.
  const resolvedTag = useMemo(() => {
    if (!activeTag) return null;
    const k = tagKey(activeTag);
    for (const item of allItems) {
      for (const t of item.tags ?? []) {
        if (tagKey(t) === k) return t;
      }
    }
    return activeTag;
  }, [activeTag, allItems]);

  const tagFiltered = useMemo(() => {
    if (!resolvedTag) return sorted;
    const k = tagKey(resolvedTag);
    return sorted.filter((i) => (i.tags ?? []).some((t) => tagKey(t) === k));
  }, [sorted, resolvedTag]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tagFiltered;
    return tagFiltered.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [tagFiltered, query]);

  const onMove = async (item: ShoppingItem, dir: -1 | 1) => {
    const idx = sorted.findIndex((i) => i.id === item.id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    await reorderShoppingItem(item.id, next);
  };

  const onDelete = async (item: ShoppingItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await deleteShoppingItem(item.id);
    if (item.photoId) await deletePhoto(item.photoId);
    toast.show('Deleted');
  };

  const subtitle = resolvedTag
    ? `${tagFiltered.length} tagged · ${allItems.length} total`
    : `${allItems.length} in library`;

  return (
    <div>
      <Link
        to="/shopping/items"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> {resolvedTag ? 'Tags' : 'Shopping'}
      </Link>
      <PageHeader
        title={resolvedTag ?? 'All Items'}
        subtitle={subtitle}
        action={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> New
          </button>
        }
      />

      {resolvedTag && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-500 dark:text-ink-400">Filtering by tag:</span>
          <Link
            to="/shopping/items"
            className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-1 text-xs font-medium text-ink-50 hover:bg-ink-800 dark:bg-ink-50 dark:text-ink-900 dark:hover:bg-ink-200"
            aria-label={`Clear filter ${resolvedTag}`}
          >
            {resolvedTag}
            <X size={12} />
          </Link>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="relative mb-4">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            className="input pl-9"
            placeholder={resolvedTag ? `Search within “${resolvedTag}”` : 'Search items or tags'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title="No items yet"
          description="Add reusable line items here, then drop them into a list."
          action={
            <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> Add an item
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title="No matches"
          description={
            resolvedTag
              ? `No items tagged “${resolvedTag}” match your search.`
              : 'No items match your search.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const trueIdx = sorted.findIndex((s) => s.id === item.id);
            const canUp = trueIdx > 0;
            const canDown = trueIdx < sorted.length - 1;
            // Reordering applies to the full library; hide arrows when the
            // user is looking at a subset, since the visible order isn't the
            // canonical one.
            const reorderable = !query.trim() && !resolvedTag;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900"
              >
                {item.photoId ? (
                  <button
                    type="button"
                    onClick={() => setPreviewing(item.photoId!)}
                    className="shrink-0 overflow-hidden rounded-xl"
                    aria-label={`View photo for ${item.name}`}
                  >
                    <Thumbnail photoId={item.photoId} size={48} />
                  </button>
                ) : (
                  <Thumbnail photoId={item.photoId} size={48} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.name}</div>
                  {item.notes && (
                    <div className="truncate text-xs text-ink-500 dark:text-ink-400">{item.notes}</div>
                  )}
                  {(item.tags?.length ?? 0) > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.tags!.map((t) => (
                        <Link
                          key={t}
                          to={`/shopping/items?tag=${encodeURIComponent(t)}`}
                          className={[
                            'rounded-full px-2 py-0.5 text-[10px] font-medium',
                            resolvedTag && tagKey(t) === tagKey(resolvedTag)
                              ? 'bg-ink-900 text-ink-50 dark:bg-ink-50 dark:text-ink-900'
                              : 'bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700',
                          ].join(' ')}
                        >
                          {t}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {reorderable && (
                    <>
                      <IconBtn label="Move up" onClick={() => onMove(item, -1)} disabled={!canUp}>
                        <ChevronUp size={16} />
                      </IconBtn>
                      <IconBtn label="Move down" onClick={() => onMove(item, 1)} disabled={!canDown}>
                        <ChevronDown size={16} />
                      </IconBtn>
                    </>
                  )}
                  <IconBtn label="Edit" onClick={() => setEditing(item)}>
                    <Pencil size={16} />
                  </IconBtn>
                  <IconBtn label="Delete" onClick={() => onDelete(item)} tone="danger">
                    <Trash2 size={16} />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ItemFormModal
        open={creating}
        title="New item"
        initial={
          resolvedTag ? { ...EMPTY_DRAFT, tags: [resolvedTag] } : EMPTY_DRAFT
        }
        existingItems={allItems}
        onClose={() => setCreating(false)}
        onSubmit={async (draft) => {
          await createShoppingItem({
            name: draft.name.trim(),
            notes: draft.notes.trim() || undefined,
            photoId: draft.photoId,
            tags: draft.tags.length > 0 ? draft.tags : undefined,
          });
          setCreating(false);
          toast.show('Added');
        }}
      />

      <ItemFormModal
        open={!!editing}
        title="Edit item"
        initial={
          editing
            ? {
                name: editing.name,
                notes: editing.notes ?? '',
                photoId: editing.photoId,
                tags: editing.tags ?? [],
              }
            : EMPTY_DRAFT
        }
        existingItems={allItems}
        onClose={() => setEditing(null)}
        onSubmit={async (draft) => {
          if (!editing) return;
          await updateShoppingItem(editing.id, {
            name: draft.name.trim(),
            notes: draft.notes.trim() || undefined,
            photoId: draft.photoId,
            tags: draft.tags.length > 0 ? draft.tags : undefined,
          });
          setEditing(null);
          toast.show('Saved');
        }}
      />

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

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        'rounded-lg p-2 transition disabled:opacity-30',
        tone === 'danger'
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
          : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ItemFormModal({
  open,
  title,
  initial,
  existingItems,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: DraftItem;
  existingItems: ShoppingItem[];
  onClose: () => void;
  onSubmit: (draft: DraftItem) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);

  // Reset whenever the modal opens with new initial values.
  useResetOnOpen(open, () => setDraft(initial));

  // Tag suggestions across the whole library, sorted by frequency desc.
  const suggestions: TagSuggestion[] = useMemo(() => {
    const counts = new Map<string, { tag: string; count: number }>();
    for (const item of existingItems) {
      for (const t of item.tags ?? []) {
        const k = tagKey(t);
        const prev = counts.get(k);
        if (prev) prev.count += 1;
        else counts.set(k, { tag: t, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });
  }, [existingItems]);

  const canSave = draft.name.trim().length > 0 && !busy;

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSave}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(draft);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="item-name">Name</label>
          <input
            id="item-name"
            className="input mt-1"
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Lettuce"
          />
        </div>
        <div>
          <label className="label" htmlFor="item-notes">Notes (optional)</label>
          <textarea
            id="item-notes"
            className="input mt-1 min-h-[64px] resize-y"
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Romaine, not iceberg"
          />
        </div>
        <div>
          <span className="label">Tags (optional)</span>
          <div className="mt-1">
            <TagInput
              value={draft.tags}
              onChange={(tags) => setDraft((d) => ({ ...d, tags: dedupeTags(tags) }))}
              suggestions={suggestions}
            />
          </div>
        </div>
        <div>
          <span className="label">Photo (optional)</span>
          <div className="mt-1">
            <PhotoPicker
              photoId={draft.photoId}
              onChange={(photoId) => setDraft((d) => ({ ...d, photoId }))}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function useResetOnOpen(open: boolean, fn: () => void) {
  // Run only on each open transition; intentionally not depending on `fn`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) fn(); }, [open]);
}
