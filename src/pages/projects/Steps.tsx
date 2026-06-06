import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, Wrench, Link2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { PhotoPicker } from '@/components/inputs/PhotoPicker';
import { TagInput } from '@/components/inputs/TagInput';
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
import { dedupeTags, tagKey, type TagSuggestion } from '@/lib/tags';
import { searchItems, matchingTags } from '@/lib/itemSearch';
import { normalizeUrl } from '@/lib/url';

type Draft = { name: string; notes: string; url: string; tags: string[]; photoId: string | undefined };
const EMPTY: Draft = { name: '', notes: '', url: '', tags: [], photoId: undefined };

export function ProjectSteps() {
  const steps = useProjectSteps();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ProjectStep | null>(null);
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(() => steps?.slice().sort((a, b) => a.order - b.order) ?? [], [steps]);
  const filtered = useMemo(() => searchItems(sorted, query), [sorted, query]);

  // Tag suggestions across the whole library, sorted by frequency desc.
  const suggestions: TagSuggestion[] = useMemo(() => {
    const counts = new Map<string, { tag: string; count: number }>();
    for (const step of sorted) {
      for (const t of step.tags ?? []) {
        const k = tagKey(t);
        const prev = counts.get(k);
        if (prev) prev.count += 1;
        else counts.set(k, { tag: t, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => (b.count !== a.count ? b.count - a.count : a.tag.localeCompare(b.tag)));
  }, [sorted]);

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
          <input className="input pl-9" placeholder="Search steps or tags" value={query} onChange={(e) => setQuery(e.target.value)} />
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
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{step.name}</span>
                    {step.url && <Link2 size={13} className="shrink-0 text-ink-400" aria-label="Has a link" />}
                  </div>
                  {step.notes && <div className="truncate text-xs text-ink-500 dark:text-ink-400">{step.notes}</div>}
                  {(step.tags?.length ?? 0) > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {step.tags!.map((t) => (
                        <span key={t} className={['rounded-full px-1.5 py-0.5 text-[10px] font-medium', matchingTags(step, query).some((m) => tagKey(m) === tagKey(t)) ? 'bg-ink-900 text-ink-50 dark:bg-ink-50 dark:text-ink-900' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'].join(' ')}>{t}</span>
                      ))}
                    </div>
                  )}
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

      <FormModal open={creating} title="New step" initial={EMPTY} suggestions={suggestions} onClose={() => setCreating(false)}
        onSubmit={async (d) => { await createProjectStep({ name: d.name.trim(), notes: d.notes.trim() || undefined, url: normalizeUrl(d.url), tags: d.tags.length > 0 ? d.tags : undefined, photoId: d.photoId }); setCreating(false); toast.show('Added'); }} />
      <FormModal open={!!editing} title="Edit step" initial={editing ? { name: editing.name, notes: editing.notes ?? '', url: editing.url ?? '', tags: editing.tags ?? [], photoId: editing.photoId } : EMPTY} suggestions={suggestions} onClose={() => setEditing(null)}
        onSubmit={async (d) => { if (!editing) return; await updateProjectStep(editing.id, { name: d.name.trim(), notes: d.notes.trim() || undefined, url: normalizeUrl(d.url), tags: d.tags.length > 0 ? d.tags : undefined, photoId: d.photoId }); setEditing(null); toast.show('Saved'); }} />
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, tone }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; tone?: 'danger' }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={['rounded-lg p-2 transition disabled:opacity-30', tone === 'danger' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'].join(' ')}>{children}</button>;
}

function FormModal({ open, title, initial, suggestions, onClose, onSubmit }: { open: boolean; title: string; initial: Draft; suggestions: TagSuggestion[]; onClose: () => void; onSubmit: (d: Draft) => Promise<void> }) {
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
        <div><label className="label" htmlFor="ps-url">Link (optional)</label><input id="ps-url" type="url" inputMode="url" className="input mt-1" value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://example.com/guide" /><p className="mt-1 text-xs text-ink-400">Opens in a new tab while running, without checking the step off.</p></div>
        <div><span className="label">Tags (optional)</span><div className="mt-1"><TagInput value={draft.tags} onChange={(tags) => setDraft((d) => ({ ...d, tags: dedupeTags(tags) }))} suggestions={suggestions} /></div></div>
        <div><span className="label">Photo (optional)</span><div className="mt-1"><PhotoPicker photoId={draft.photoId} onChange={(photoId) => setDraft((d) => ({ ...d, photoId }))} /></div></div>
      </div>
    </Modal>
  );
}
