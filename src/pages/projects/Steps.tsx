import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { PhotoPicker } from '@/components/inputs/PhotoPicker';
import { useToast } from '@/components/ui/Toast';
import {
  createProjectStep,
  updateProjectStep,
  deleteProjectStep,
  deletePhoto,
  reorderProjectStep,
  useProjectSteps,
} from '@/db/repo';
import type { ProjectStep } from '@/types';

type Draft = { name: string; notes: string; photoId: string | undefined };
const EMPTY: Draft = { name: '', notes: '', photoId: undefined };

export function ProjectSteps() {
  const steps = useProjectSteps();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ProjectStep | null>(null);
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(() => steps?.slice().sort((a, b) => a.order - b.order) ?? [], [steps]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? sorted.filter((s) => s.name.toLowerCase().includes(q)) : sorted; }, [sorted, query]);

  const onMove = async (step: ProjectStep, dir: -1 | 1) => {
    const idx = sorted.findIndex((s) => s.id === step.id);
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    await reorderProjectStep(step.id, next);
  };
  const onDelete = async (step: ProjectStep) => {
    if (!confirm(`Delete "${step.name}"?`)) return;
    await deleteProjectStep(step.id);
    if (step.photoId) await deletePhoto(step.photoId);
    toast.show('Deleted');
  };

  return (
    <div>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"><ChevronLeft size={16} /> Projects</Link>
      <PageHeader title="Steps" subtitle={`${sorted.length} in library`}
        action={<button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> New</button>} />

      {sorted.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search steps" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={<Wrench size={28} />} title="No steps yet" description="Add reusable steps here, then drop them into a list."
          action={<button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Add a step</button>} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((step) => {
            const trueIdx = sorted.findIndex((s) => s.id === step.id);
            const canUp = trueIdx > 0;
            const canDown = trueIdx < sorted.length - 1;
            const queryActive = query.trim().length > 0;
            return (
              <li key={step.id} className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
                <Thumbnail photoId={step.photoId} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{step.name}</div>
                  {step.notes && <div className="truncate text-xs text-ink-500 dark:text-ink-400">{step.notes}</div>}
                </div>
                <div className="flex items-center gap-1">
                  {!queryActive && (
                    <>
                      <IconBtn label="Move up" onClick={() => onMove(step, -1)} disabled={!canUp}><ChevronUp size={16} /></IconBtn>
                      <IconBtn label="Move down" onClick={() => onMove(step, 1)} disabled={!canDown}><ChevronDown size={16} /></IconBtn>
                    </>
                  )}
                  <IconBtn label="Edit" onClick={() => setEditing(step)}><Pencil size={16} /></IconBtn>
                  <IconBtn label="Delete" onClick={() => onDelete(step)} tone="danger"><Trash2 size={16} /></IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FormModal open={creating} title="New step" initial={EMPTY} onClose={() => setCreating(false)}
        onSubmit={async (d) => { await createProjectStep({ name: d.name.trim(), notes: d.notes.trim() || undefined, photoId: d.photoId }); setCreating(false); toast.show('Added'); }} />
      <FormModal open={!!editing} title="Edit step" initial={editing ? { name: editing.name, notes: editing.notes ?? '', photoId: editing.photoId } : EMPTY} onClose={() => setEditing(null)}
        onSubmit={async (d) => { if (!editing) return; await updateProjectStep(editing.id, { name: d.name.trim(), notes: d.notes.trim() || undefined, photoId: d.photoId }); setEditing(null); toast.show('Saved'); }} />
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, tone }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; tone?: 'danger' }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={['rounded-lg p-2 transition disabled:opacity-30', tone === 'danger' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'].join(' ')}>{children}</button>;
}

function FormModal({ open, title, initial, onClose, onSubmit }: { open: boolean; title: string; initial: Draft; onClose: () => void; onSubmit: (d: Draft) => Promise<void> }) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setDraft(initial); }, [open]);
  const canSave = draft.name.trim().length > 0 && !busy;
  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={title}
      footer={<><button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className="btn-primary" disabled={!canSave} onClick={async () => { setBusy(true); try { await onSubmit(draft); } finally { setBusy(false); } }}>Save</button></>}>
      <div className="space-y-4">
        <div><label className="label" htmlFor="ps-name">Name</label><input id="ps-name" className="input mt-1" autoFocus value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Sand the rail" /></div>
        <div><label className="label" htmlFor="ps-notes">Notes (optional)</label><textarea id="ps-notes" className="input mt-1 min-h-[64px] resize-y" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} /></div>
        <div><span className="label">Photo (optional)</span><div className="mt-1"><PhotoPicker photoId={draft.photoId} onChange={(photoId) => setDraft((d) => ({ ...d, photoId }))} /></div></div>
      </div>
    </Modal>
  );
}
