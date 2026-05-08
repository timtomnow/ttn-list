import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/Toast';
import { deleteProjectProcess, deletePhoto, reorderProjectProcess, useProjectProcesses } from '@/db/repo';
import type { ProjectProcess } from '@/types';

export function ProjectProcesses() {
  const processes = useProjectProcesses();
  const toast = useToast();
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => processes?.slice().sort((a, b) => a.order - b.order) ?? [], [processes]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? sorted.filter((p) => p.name.toLowerCase().includes(q)) : sorted; }, [sorted, query]);

  const onMove = async (p: ProjectProcess, dir: -1 | 1) => {
    const idx = sorted.findIndex((s) => s.id === p.id);
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    await reorderProjectProcess(p.id, next);
  };

  const onDelete = async (p: ProjectProcess) => {
    if (!confirm(`Delete process "${p.name}"? Steps inside it are kept.`)) return;
    await deleteProjectProcess(p.id);
    if (p.photoId) await deletePhoto(p.photoId);
    toast.show('Deleted');
  };

  return (
    <div>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"><ChevronLeft size={16} /> Projects</Link>
      <PageHeader title="Processes" subtitle={`${sorted.length} defined`} action={<Link to="new" className="btn-primary"><Plus size={16} /> New</Link>} />

      {sorted.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search processes" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={<FolderOpen size={28} />} title="No processes yet" description="A process is a named ordered sequence of steps you can drop into multiple project lists."
          action={<Link to="new" className="btn-primary"><Plus size={16} /> Add a process</Link>} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const trueIdx = sorted.findIndex((s) => s.id === p.id);
            const canUp = trueIdx > 0;
            const canDown = trueIdx < sorted.length - 1;
            const queryActive = query.trim().length > 0;
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
                <Thumbnail photoId={p.photoId} size={48} />
                <Link to={p.id} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-xs text-ink-500 dark:text-ink-400">
                    {p.members.length} {p.members.length === 1 ? 'step' : 'steps'}{p.notes ? ` · ${p.notes}` : ''}
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  {!queryActive && (
                    <>
                      <IconBtn label="Move up" onClick={() => onMove(p, -1)} disabled={!canUp}><ChevronUp size={16} /></IconBtn>
                      <IconBtn label="Move down" onClick={() => onMove(p, 1)} disabled={!canDown}><ChevronDown size={16} /></IconBtn>
                    </>
                  )}
                  <Link to={p.id} aria-label="Edit" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"><Pencil size={16} /></Link>
                  <IconBtn label="Delete" onClick={() => onDelete(p)} tone="danger"><Trash2 size={16} /></IconBtn>
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
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={['rounded-lg p-2 transition disabled:opacity-30', tone === 'danger' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'].join(' ')}>{children}</button>;
}
