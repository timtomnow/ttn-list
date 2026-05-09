import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronUp, ChevronDown, Trash2, Plus, Search, X, Sparkles, Play, PenLine } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/Toast';
import {
  createProjectList,
  updateProjectList,
  useProjectSteps,
  useProjectList,
  useProjectProcesses,
} from '@/db/repo';
import type { ProjectStep, ProjectProcess, ProjectListEntry } from '@/types';
import { moveProjectEntry, resolveProjectList } from '@/lib/projects';
import { useDeadLinkBail } from '@/hooks/useDeadLinkBail';
import { newId } from '@/lib/id';

export function ProjectListEditor() {
  const { id } = useParams();
  const isNew = !id;
  const existing = useProjectList(isNew ? null : id);
  const steps = useProjectSteps();
  const processes = useProjectProcesses();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<ProjectListEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [picker, setPicker] = useState<'step' | 'process' | null>(null);
  const [busy, setBusy] = useState(false);
  const [tempInput, setTempInput] = useState('');

  useEffect(() => {
    if (isNew) { setHydrated(true); return; }
    if (existing && !hydrated) {
      setName(existing.name); setNotes(existing.notes ?? ''); setEntries(existing.entries); setHydrated(true);
    }
  }, [existing, hydrated, isNew]);

  const dead = useDeadLinkBail(existing, !isNew && !hydrated);
  useEffect(() => {
    if (!dead) return;
    toast.show('That list no longer exists', 'error');
    navigate('/projects/lists', { replace: true });
  }, [dead, navigate, toast]);

  const stepsById = useMemo(() => { const m = new Map<string, ProjectStep>(); steps?.forEach((s) => m.set(s.id, s)); return m; }, [steps]);
  const processesById = useMemo(() => { const m = new Map<string, ProjectProcess>(); processes?.forEach((p) => m.set(p.id, p)); return m; }, [processes]);
  const sortedSteps = useMemo(() => steps?.slice().sort((a, b) => a.order - b.order) ?? [], [steps]);
  const sortedProcesses = useMemo(() => processes?.slice().sort((a, b) => a.order - b.order) ?? [], [processes]);

  const usedFreeStepIds = useMemo(() => { const s = new Set<string>(); for (const e of entries) if (e.kind === 'step') s.add(e.stepId); return s; }, [entries]);
  const usedProcessIds = useMemo(() => { const s = new Set<string>(); for (const e of entries) if (e.kind === 'process') s.add(e.processId); return s; }, [entries]);

  const move = (idx: number, dir: -1 | 1) => setEntries((prev) => moveProjectEntry(prev, idx, dir));
  const remove = (idx: number) => setEntries((prev) => prev.filter((_, i) => i !== idx));

  const toggleExclusion = (idx: number, stepId: string) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== idx || e.kind !== 'process') return e;
        const cur = new Set(e.excludedStepIds ?? []);
        if (cur.has(stepId)) cur.delete(stepId); else cur.add(stepId);
        const arr = [...cur];
        return { ...e, excludedStepIds: arr.length ? arr : undefined };
      }),
    );
  };

  const addSteps = (ids: string[]) => { setEntries((prev) => [...prev, ...ids.map<ProjectListEntry>((stepId) => ({ kind: 'step', stepId }))]); setPicker(null); };
  const addProcesses = (ids: string[]) => { setEntries((prev) => [...prev, ...ids.map<ProjectListEntry>((processId) => ({ kind: 'process', processId }))]); setPicker(null); };
  const addTempItems = () => {
    const names = tempInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    setEntries((prev) => [
      ...prev,
      ...names.map<ProjectListEntry>((name) => ({ kind: 'temp', tempId: newId(), name })),
    ]);
    setTempInput('');
  };

  const onSave = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (isNew) {
        const created = await createProjectList({ name: name.trim(), notes: notes.trim() || undefined, entries });
        toast.show('List created');
        navigate(`/projects/lists/${created.id}`, { replace: true });
      } else {
        if (!id) return;
        await updateProjectList(id, { name: name.trim(), notes: notes.trim() || undefined, entries });
        toast.show('Saved');
      }
    } finally { setBusy(false); }
  };

  const previewList = useMemo(() => ({ id: id ?? 'preview', name, entries, order: 0, createdAt: 0, updatedAt: 0 }), [id, name, entries]);
  const resolved = useMemo(() => resolveProjectList(previewList, steps, processes), [previewList, steps, processes]);

  if (!isNew && !existing && !hydrated) {
    return <div><Link to="/projects/lists" className="text-sm text-ink-500"><ChevronLeft size={14} /> Lists</Link><p className="mt-4 text-sm text-ink-500">Loading…</p></div>;
  }

  return (
    <div>
      <Link to="/projects/lists" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"><ChevronLeft size={16} /> Lists</Link>
      <PageHeader title={isNew ? 'New list' : 'Edit list'} subtitle="Mix steps and processes. Order is preserved into Run it mode."
        action={!isNew && id ? <Link to={`/projects/lists/${id}/run`} className="btn-secondary"><Play size={16} /> Run it</Link> : undefined} />

      <div className="space-y-5">
        <section className="card space-y-4 p-5">
          <div><label className="label" htmlFor="pl-name">Name</label><input id="pl-name" className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Refinish the deck" /></div>
          <div><label className="label" htmlFor="pl-notes">Notes (optional)</label><textarea id="pl-notes" className="input mt-1 min-h-[64px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Entries ({entries.length})</div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setPicker('step')} disabled={!steps}><Plus size={14} /> Step</button>
              <button type="button" className="btn-secondary" onClick={() => setPicker('process')} disabled={!processes}><Plus size={14} /> Process</button>
            </div>
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">Empty list — add steps or whole processes above.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((e, idx) =>
                e.kind === 'step' ? (
                  <StepEntry key={`${idx}-${e.stepId}`} entry={e} step={stepsById.get(e.stepId)} canUp={idx > 0} canDown={idx < entries.length - 1} onMove={(d) => move(idx, d)} onRemove={() => remove(idx)} />
                ) : e.kind === 'temp' ? (
                  <TempEntry key={`${idx}-${e.tempId}`} entry={e} canUp={idx > 0} canDown={idx < entries.length - 1} onMove={(d) => move(idx, d)} onRemove={() => remove(idx)} />
                ) : (
                  <ProcessEntry key={`${idx}-${e.processId}`} entry={e} process={processesById.get(e.processId)} steps={stepsById} canUp={idx > 0} canDown={idx < entries.length - 1} onMove={(d) => move(idx, d)} onRemove={() => remove(idx)} onToggleExclusion={(memberId) => toggleExclusion(idx, memberId)} />
                ),
              )}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <PenLine size={16} className="text-ink-500" />
            <div className="text-sm font-medium">Temporary steps</div>
            <span className="text-xs text-ink-500">List-only · won't be saved to your library</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="pick up paint, return drill, call electrician"
              value={tempInput}
              onChange={(e) => setTempInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTempItems();
                }
              }}
            />
            <button type="button" className="btn-secondary" onClick={addTempItems} disabled={!tempInput.trim()}>
              <Plus size={14} /> Add
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
            Separate multiple steps with commas.
          </p>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-ink-500" />
            <div className="text-sm font-medium">Preview</div>
            <span className="text-xs text-ink-500">{resolved.length} {resolved.length === 1 ? 'unique step' : 'unique steps'}</span>
          </div>
          {resolved.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">The resolved step list will appear here once you add entries.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {resolved.map((row) => {
                const step = stepsById.get(row.stepId);
                return (
                  <li key={row.stepId} className="flex items-center gap-3">
                    <Thumbnail photoId={step?.photoId} size={28} />
                    <span className="flex-1 truncate">{row.name ?? step?.name ?? '—'}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex gap-2"><button type="button" className="btn-primary flex-1" disabled={!name.trim() || busy} onClick={onSave}>{isNew ? 'Create list' : 'Save changes'}</button></div>
      </div>

      <PickStepsModal open={picker === 'step'} steps={sortedSteps} excludeIds={usedFreeStepIds} onClose={() => setPicker(null)} onConfirm={addSteps} />
      <PickProcessesModal open={picker === 'process'} processes={sortedProcesses} excludeIds={usedProcessIds} onClose={() => setPicker(null)} onConfirm={addProcesses} />
    </div>
  );
}

function StepEntry({ entry, step, canUp, canDown, onMove, onRemove }: { entry: Extract<ProjectListEntry, { kind: 'step' }>; step: ProjectStep | undefined; canUp: boolean; canDown: boolean; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  return (
    <li className="rounded-xl border border-ink-200 bg-white p-2 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center gap-3">
        <Thumbnail photoId={step?.photoId} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{step?.name ?? <em className="text-ink-400">deleted step</em>}</div>
          <div className="text-xs text-ink-500">step</div>
        </div>
        <Arrows canUp={canUp} canDown={canDown} onMove={onMove} />
        <RemoveBtn onClick={onRemove} />
      </div>
      <span className="hidden">{entry.stepId}</span>
    </li>
  );
}

function TempEntry({ entry, canUp, canDown, onMove, onRemove }: { entry: Extract<ProjectListEntry, { kind: 'temp' }>; canUp: boolean; canDown: boolean; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  return (
    <li className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-2 dark:border-amber-700 dark:bg-amber-950/20">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" aria-hidden>
          <PenLine size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{entry.name}</div>
          <div className="text-xs text-ink-500">temporary</div>
        </div>
        <Arrows canUp={canUp} canDown={canDown} onMove={onMove} />
        <RemoveBtn onClick={onRemove} />
      </div>
    </li>
  );
}

function ProcessEntry({ entry, process, steps, canUp, canDown, onMove, onRemove, onToggleExclusion }: { entry: Extract<ProjectListEntry, { kind: 'process' }>; process: ProjectProcess | undefined; steps: Map<string, ProjectStep>; canUp: boolean; canDown: boolean; onMove: (dir: -1 | 1) => void; onRemove: () => void; onToggleExclusion: (memberId: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const excluded = new Set(entry.excludedStepIds ?? []);

  return (
    <li className="rounded-xl border border-ink-200 bg-white p-2 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center gap-3">
        <Thumbnail photoId={process?.photoId} size={36} />
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          <div className="truncate text-sm font-medium">{process?.name ?? <em className="text-ink-400">deleted process</em>}</div>
          <div className="text-xs text-ink-500">
            process · {process ? process.members.length : 0} members
            {excluded.size > 0 && ` · ${excluded.size} excluded`}
          </div>
        </button>
        <Arrows canUp={canUp} canDown={canDown} onMove={onMove} />
        <RemoveBtn onClick={onRemove} />
      </div>
      {expanded && process && (
        <div className="mt-3 border-t border-ink-100 pt-3 dark:border-ink-800">
          <div className="mb-1.5 text-xs text-ink-500">Tap to toggle. Excluded members are skipped on this list only.</div>
          <ul className="space-y-1">
            {process.members.map((m) => {
              const step = steps.get(m.stepId);
              const isExcluded = excluded.has(m.stepId);
              return (
                <li key={m.stepId}>
                  <button type="button" onClick={() => onToggleExclusion(m.stepId)} className={['flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition', isExcluded ? 'text-ink-400 line-through' : 'hover:bg-ink-50 dark:hover:bg-ink-800/60'].join(' ')}>
                    <Thumbnail photoId={step?.photoId} size={24} />
                    <span className="flex-1 truncate">{step?.name ?? '—'}</span>
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
      <button type="button" aria-label="Move up" disabled={!canUp} onClick={() => onMove(-1)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:text-ink-400 dark:hover:bg-ink-800"><ChevronUp size={16} /></button>
      <button type="button" aria-label="Move down" disabled={!canDown} onClick={() => onMove(1)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:text-ink-400 dark:hover:bg-ink-800"><ChevronDown size={16} /></button>
    </>
  );
}
function RemoveBtn({ onClick }: { onClick: () => void }) {
  return <button type="button" aria-label="Remove" onClick={onClick} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 size={16} /></button>;
}

function PickStepsModal({ open, steps, excludeIds, onClose, onConfirm }: { open: boolean; steps: ProjectStep[]; excludeIds: Set<string>; onClose: () => void; onConfirm: (ids: string[]) => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) { setPicked(new Set()); setQuery(''); } }, [open]);
  const available = useMemo(() => steps.filter((s) => !excludeIds.has(s.id)), [steps, excludeIds]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? available.filter((s) => s.name.toLowerCase().includes(q)) : available; }, [available, query]);

  return (
    <Modal open={open} onClose={onClose} title="Add steps"
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" disabled={picked.size === 0} onClick={() => onConfirm([...picked])}>Add {picked.size > 0 && `(${picked.size})`}</button></>}>
      {available.length === 0 ? (
        <EmptyState title="Nothing to add" description="Either you've already added every step, or your library is empty." />
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Search steps" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Clear"><X size={14} /></button>}
          </div>
          <ul className="max-h-72 space-y-1 overflow-auto">
            {filtered.map((s) => (
              <PickRow key={s.id} photoId={s.photoId} name={s.name} checked={picked.has(s.id)}
                onClick={() => setPicked((p) => { const n = new Set(p); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })} />
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function PickProcessesModal({ open, processes, excludeIds, onClose, onConfirm }: { open: boolean; processes: ProjectProcess[]; excludeIds: Set<string>; onClose: () => void; onConfirm: (ids: string[]) => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) { setPicked(new Set()); setQuery(''); } }, [open]);
  const available = useMemo(() => processes.filter((p) => !excludeIds.has(p.id)), [processes, excludeIds]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? available.filter((p) => p.name.toLowerCase().includes(q)) : available; }, [available, query]);

  return (
    <Modal open={open} onClose={onClose} title="Add processes"
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" disabled={picked.size === 0} onClick={() => onConfirm([...picked])}>Add {picked.size > 0 && `(${picked.size})`}</button></>}>
      {available.length === 0 ? (
        <EmptyState title="Nothing to add" description="Either you've already added every process, or your library is empty." />
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Search processes" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <ul className="max-h-72 space-y-1 overflow-auto">
            {filtered.map((p) => (
              <PickRow key={p.id} photoId={p.photoId} name={p.name} subtitle={`${p.members.length} member${p.members.length === 1 ? '' : 's'}`} checked={picked.has(p.id)}
                onClick={() => setPicked((picked) => { const n = new Set(picked); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} />
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function PickRow({ photoId, name, subtitle, checked, onClick }: { photoId: string | undefined; name: string; subtitle?: string; checked: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={['flex w-full items-center gap-3 rounded-xl border p-2 text-left transition', checked ? 'border-ink-900 bg-ink-900/5 dark:border-ink-50 dark:bg-ink-50/5' : 'border-ink-200 hover:border-ink-300 dark:border-ink-800 dark:hover:border-ink-700'].join(' ')}>
        <Thumbnail photoId={photoId} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{name}</div>
          {subtitle && <div className="truncate text-xs text-ink-500">{subtitle}</div>}
        </div>
        <span className={['grid h-5 w-5 place-items-center rounded-md border', checked ? 'border-ink-900 bg-ink-900 text-ink-50 dark:border-ink-50 dark:bg-ink-50 dark:text-ink-900' : 'border-ink-300 dark:border-ink-700'].join(' ')} aria-hidden>{checked ? '✓' : ''}</span>
      </button>
    </li>
  );
}
