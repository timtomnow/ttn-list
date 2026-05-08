import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Trash2, Repeat, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/Toast';
import {
  deletePhoto,
  deleteProjectSession,
  useProjectSteps,
  useProjectList,
  useProjectSession,
} from '@/db/repo';
import type { ProjectStep } from '@/types';

export function ProjectHistoryDetail() {
  const { id } = useParams();
  const session = useProjectSession(id);
  const steps = useProjectSteps();
  const list = useProjectList(session?.listId);
  const navigate = useNavigate();
  const toast = useToast();
  const [previewing, setPreviewing] = useState<string | null>(null);

  const stepsById = useMemo(() => { const m = new Map<string, ProjectStep>(); steps?.forEach((s) => m.set(s.id, s)); return m; }, [steps]);

  if (!session) return <div><Link to="/projects/history" className="text-sm text-ink-500"><ChevronLeft size={14} /> History</Link><EmptyState title="Session not found" description="It may have been deleted." action={<Link to="/projects/history" className="btn-primary">Back to history</Link>} /></div>;

  if (session.completedAt === undefined) {
    return (
      <div>
        <Link to="/projects/lists" className="text-sm text-ink-500"><ChevronLeft size={14} /> Lists</Link>
        <EmptyState title="Still in progress" description="This run hasn't been wrapped up yet. Continue from the Lists page."
          action={<Link to={`/projects/lists/${session.listId}/run`} className="btn-primary">Continue</Link>} />
      </div>
    );
  }

  const listExists = !!list;

  const onDelete = async () => {
    if (!confirm('Delete this session and any photos attached to it?')) return;
    await Promise.all(session.photoIds.map((p) => deletePhoto(p)));
    await deleteProjectSession(session.id);
    toast.show('Session deleted');
    navigate('/projects/history');
  };
  const onRerun = () => { if (!listExists) return; navigate(`/projects/lists/${session.listId}/run`); };

  const checked = session.resolvedSteps.filter((r) => r.checked).length;
  const total = session.resolvedSteps.length;

  return (
    <div>
      <Link to="/projects/history" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"><ChevronLeft size={16} /> History</Link>
      <PageHeader title={session.listName} subtitle={`${formatTs(session.completedAt ?? session.startedAt)} · ${checked}/${total} checked`}
        action={<button type="button" className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={onDelete} aria-label="Delete session"><Trash2 size={18} /></button>} />

      <div className="space-y-5">
        <div className="flex gap-2">
          <button type="button" className="btn-primary flex-1" disabled={!listExists} onClick={onRerun} title={listExists ? 'Start a fresh run from the current list' : 'The underlying list was deleted'}>
            <Repeat size={16} /> Re-run this list
          </button>
        </div>
        {!listExists && <p className="text-xs text-ink-500 dark:text-ink-400">The underlying list was deleted, so re-run is unavailable. The historical record below is preserved.</p>}

        {session.photoIds.length > 0 && (
          <section className="card p-5">
            <div className="mb-3 text-sm font-medium">Photos ({session.photoIds.length})</div>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {session.photoIds.map((pid) => (
                <li key={pid}><button type="button" onClick={() => setPreviewing(pid)} className="block w-full overflow-hidden rounded-xl" aria-label="Preview photo"><Thumbnail photoId={pid} size={96} className="!h-24 !w-full" /></button></li>
              ))}
            </ul>
          </section>
        )}

        {session.notes && (
          <section className="card p-5">
            <div className="mb-2 text-sm font-medium">Notes</div>
            <p className="whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{session.notes}</p>
          </section>
        )}

        <section className="card p-5">
          <div className="mb-3 text-sm font-medium">Steps</div>
          <ul className="space-y-1.5 text-sm">
            {session.resolvedSteps.map((r, i) => {
              const step = stepsById.get(r.stepId);
              return (
                <li key={`${r.stepId}-${i}`} className={['flex items-center gap-2', r.checked ? '' : 'text-ink-400'].join(' ')}>
                  <span aria-hidden className="grid h-5 w-5 place-items-center">{r.checked ? <Check size={14} /> : '·'}</span>
                  <Thumbnail photoId={step?.photoId} size={28} />
                  <span className={['flex-1 truncate', r.checked ? '' : 'line-through'].join(' ')}>{step?.name ?? <em className="text-ink-300">deleted step</em>}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title="Photo">
        {previewing && <div className="flex justify-center"><Thumbnail photoId={previewing} size={320} className="!h-auto !w-full max-w-md" /></div>}
      </Modal>
    </div>
  );
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
