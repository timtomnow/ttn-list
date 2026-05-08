import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/Toast';
import {
  deleteShoppingGroup,
  deletePhoto,
  reorderShoppingGroup,
  useShoppingGroups,
} from '@/db/repo';
import type { ShoppingGroup } from '@/types';

export function ShoppingGroups() {
  const groups = useShoppingGroups();
  const toast = useToast();
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => groups?.slice().sort((a, b) => a.order - b.order) ?? [], [groups]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((g) => g.name.toLowerCase().includes(q));
  }, [sorted, query]);

  const onMove = async (g: ShoppingGroup, dir: -1 | 1) => {
    const idx = sorted.findIndex((s) => s.id === g.id);
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    await reorderShoppingGroup(g.id, next);
  };

  const onDelete = async (g: ShoppingGroup) => {
    if (!confirm(`Delete group "${g.name}"? Items in the group are kept.`)) return;
    await deleteShoppingGroup(g.id);
    if (g.photoId) await deletePhoto(g.photoId);
    toast.show('Deleted');
  };

  return (
    <div>
      <Link
        to="/shopping"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> Shopping
      </Link>
      <PageHeader
        title="Groups"
        subtitle={`${sorted.length} defined`}
        action={
          <Link to="new" className="btn-primary">
            <Plus size={16} /> New
          </Link>
        }
      />

      {sorted.length > 0 && (
        <div className="relative mb-4">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            className="input pl-9"
            placeholder="Search groups"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={28} />}
          title="No groups yet"
          description="A group is a named bundle of items — a recipe or a meal — that you can add to a list in one tap."
          action={
            <Link to="new" className="btn-primary">
              <Plus size={16} /> Add a group
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((g) => {
            const trueIdx = sorted.findIndex((s) => s.id === g.id);
            const canUp = trueIdx > 0;
            const canDown = trueIdx < sorted.length - 1;
            const queryActive = query.trim().length > 0;
            return (
              <li
                key={g.id}
                className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900"
              >
                <Thumbnail photoId={g.photoId} size={48} />
                <Link to={g.id} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{g.name}</div>
                  <div className="truncate text-xs text-ink-500 dark:text-ink-400">
                    {g.members.length} {g.members.length === 1 ? 'item' : 'items'}
                    {g.notes ? ` · ${g.notes}` : ''}
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  {!queryActive && (
                    <>
                      <IconBtn label="Move up" onClick={() => onMove(g, -1)} disabled={!canUp}>
                        <ChevronUp size={16} />
                      </IconBtn>
                      <IconBtn label="Move down" onClick={() => onMove(g, 1)} disabled={!canDown}>
                        <ChevronDown size={16} />
                      </IconBtn>
                    </>
                  )}
                  <Link
                    to={g.id}
                    aria-label="Edit"
                    className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
                  >
                    <Pencil size={16} />
                  </Link>
                  <IconBtn label="Delete" onClick={() => onDelete(g)} tone="danger">
                    <Trash2 size={16} />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
