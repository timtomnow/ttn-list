import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/Toast';
import { deleteChoreRoutine, deletePhoto, reorderChoreRoutine, useChoreRoutines } from '@/db/repo';
import type { ChoreRoutine } from '@/types';

export function ChoreRoutines() {
  const routines = useChoreRoutines();
  const toast = useToast();
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => routines?.slice().sort((a, b) => a.order - b.order) ?? [], [routines]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((r) => r.name.toLowerCase().includes(q)) : sorted;
  }, [sorted, query]);

  const onMove = async (r: ChoreRoutine, dir: -1 | 1) => {
    const idx = sorted.findIndex((s) => s.id === r.id);
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    await reorderChoreRoutine(r.id, next);
  };

  const onDelete = async (r: ChoreRoutine) => {
    if (!confirm(`Delete routine "${r.name}"? Items in the routine are kept.`)) return;
    await deleteChoreRoutine(r.id);
    if (r.photoId) await deletePhoto(r.photoId);
    toast.show('Deleted');
  };

  return (
    <div>
      <Link to="/chores" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50">
        <ChevronLeft size={16} /> Chores
      </Link>
      <PageHeader
        title="Routines"
        subtitle={`${sorted.length} defined`}
        action={<Link to="new" className="btn-primary"><Plus size={16} /> New</Link>}
      />

      {sorted.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search routines" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={28} />}
          title="No routines yet"
          description="A routine bundles chores you do together — morning prep, weekly clean."
          action={<Link to="new" className="btn-primary"><Plus size={16} /> Add a routine</Link>}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const trueIdx = sorted.findIndex((s) => s.id === r.id);
            const canUp = trueIdx > 0;
            const canDown = trueIdx < sorted.length - 1;
            const queryActive = query.trim().length > 0;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
                <Thumbnail photoId={r.photoId} size={48} />
                <Link to={r.id} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="truncate text-xs text-ink-500 dark:text-ink-400">
                    {r.members.length} {r.members.length === 1 ? 'chore' : 'chores'}
                    {r.notes ? ` · ${r.notes}` : ''}
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  {!queryActive && (
                    <>
                      <IconBtn label="Move up" onClick={() => onMove(r, -1)} disabled={!canUp}><ChevronUp size={16} /></IconBtn>
                      <IconBtn label="Move down" onClick={() => onMove(r, 1)} disabled={!canDown}><ChevronDown size={16} /></IconBtn>
                    </>
                  )}
                  <Link to={r.id} aria-label="Edit" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"><Pencil size={16} /></Link>
                  <IconBtn label="Delete" onClick={() => onDelete(r)} tone="danger"><Trash2 size={16} /></IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
