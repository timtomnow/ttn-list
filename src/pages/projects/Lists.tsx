import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, ListChecks, Play, Hourglass } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { deleteProjectList, reorderProjectList, useProjectLists, useInProgressProjectSessions } from '@/db/repo';
import type { ProjectList, ProjectSession } from '@/types';

export function ProjectLists() {
  const lists = useProjectLists();
  const inProgress = useInProgressProjectSessions();
  const toast = useToast();
  const [query, setQuery] = useState('');

  const inProgressByList = useMemo(() => {
    const m = new Map<string, ProjectSession>();
    for (const s of inProgress ?? []) {
      const cur = m.get(s.listId);
      if (!cur || s.startedAt > cur.startedAt) m.set(s.listId, s);
    }
    return m;
  }, [inProgress]);

  const sorted = useMemo(() => lists?.slice().sort((a, b) => a.order - b.order) ?? [], [lists]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? sorted.filter((l) => l.name.toLowerCase().includes(q)) : sorted; }, [sorted, query]);

  const onMove = async (list: ProjectList, dir: -1 | 1) => {
    const idx = sorted.findIndex((s) => s.id === list.id);
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    await reorderProjectList(list.id, next);
  };

  const onDelete = async (list: ProjectList) => {
    if (!confirm(`Delete "${list.name}"? Past sessions are kept.`)) return;
    await deleteProjectList(list.id);
    toast.show('Deleted');
  };

  return (
    <div>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"><ChevronLeft size={16} /> Projects</Link>
      <PageHeader title="Lists" subtitle={`${sorted.length} saved`} action={<Link to="new" className="btn-primary"><Plus size={16} /> New</Link>} />

      {sorted.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search lists" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={<ListChecks size={28} />} title="No lists yet"
          description="A list bundles steps and processes for one project run. Tap Run it to step through."
          action={<Link to="new" className="btn-primary"><Plus size={16} /> Create a list</Link>} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((list) => {
            const trueIdx = sorted.findIndex((s) => s.id === list.id);
            const canUp = trueIdx > 0;
            const canDown = trueIdx < sorted.length - 1;
            const queryActive = query.trim().length > 0;
            const stepEntries = list.entries.filter((e) => e.kind === 'step').length;
            const processEntries = list.entries.length - stepEntries;
            return (
              <li key={list.id} className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
                <Link to={list.id} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{list.name}</div>
                  <div className="truncate text-xs text-ink-500 dark:text-ink-400">
                    {list.entries.length === 0 ? 'empty' : `${stepEntries} step${stepEntries === 1 ? '' : 's'}, ${processEntries} process${processEntries === 1 ? '' : 'es'}`}
                  </div>
                </Link>
                {(() => {
                  const ip = inProgressByList.get(list.id);
                  if (ip) {
                    const checked = ip.resolvedSteps.filter((r) => r.checked).length;
                    return (
                      <Link to={`${list.id}/run`} className="btn-primary h-9 px-3 text-xs" aria-label={`Continue ${list.name}`} title={`Started ${new Date(ip.startedAt).toLocaleString()}`}>
                        <Hourglass size={14} /> Continue ({checked}/{ip.resolvedSteps.length})
                      </Link>
                    );
                  }
                  return <Link to={`${list.id}/run`} className="btn-secondary h-9 px-3 text-xs" aria-label={`Run ${list.name}`}><Play size={14} /> Run</Link>;
                })()}
                <div className="flex items-center gap-1">
                  {!queryActive && (
                    <>
                      <IconBtn label="Move up" onClick={() => onMove(list, -1)} disabled={!canUp}><ChevronUp size={16} /></IconBtn>
                      <IconBtn label="Move down" onClick={() => onMove(list, 1)} disabled={!canDown}><ChevronDown size={16} /></IconBtn>
                    </>
                  )}
                  <Link to={list.id} aria-label="Edit" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"><Pencil size={16} /></Link>
                  <IconBtn label="Delete" onClick={() => onDelete(list)} tone="danger"><Trash2 size={16} /></IconBtn>
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
