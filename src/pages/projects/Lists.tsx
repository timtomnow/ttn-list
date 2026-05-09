import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Trash2, GripVertical, Search, ListChecks, Play, Hourglass } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((l) => l.name.toLowerCase().includes(q)) : sorted;
  }, [sorted, query]);

  const queryActive = query.trim().length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const newIdx = sorted.findIndex((s) => s.id === over.id);
    if (newIdx === -1) return;
    await reorderProjectList(String(active.id), newIdx);
  };

  const onDelete = async (list: ProjectList) => {
    if (!confirm(`Delete "${list.name}"? Past sessions are kept.`)) return;
    await deleteProjectList(list.id);
    toast.show('Deleted');
  };

  return (
    <div>
      <Link
        to="/projects"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> Projects
      </Link>
      <PageHeader
        title="Lists"
        subtitle={`${sorted.length} saved`}
        action={<Link to="new" className="btn-primary"><Plus size={16} /> New</Link>}
      />

      {sorted.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search lists"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={28} />}
          title="No lists yet"
          description="A list bundles steps and processes for one project run. Tap Run it to step through."
          action={<Link to="new" className="btn-primary"><Plus size={16} /> Create a list</Link>}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {filtered.map((list) => {
                const ip = inProgressByList.get(list.id);
                const stepEntries = list.entries.filter((e) => e.kind === 'step').length;
                const processEntries = list.entries.length - stepEntries;
                const subtitle =
                  list.entries.length === 0
                    ? 'empty'
                    : `${stepEntries} step${stepEntries === 1 ? '' : 's'}, ${processEntries} process${processEntries === 1 ? '' : 'es'}`;
                const runButton = ip ? (
                  <Link
                    to={`${list.id}/run`}
                    className="btn-primary h-8 px-2.5 text-xs"
                    aria-label={`Continue ${list.name}`}
                    title={`Started ${new Date(ip.startedAt).toLocaleString()}`}
                  >
                    <Hourglass size={13} /> Continue ({ip.resolvedSteps.filter((r) => r.checked).length}/{ip.resolvedSteps.length})
                  </Link>
                ) : (
                  <Link
                    to={`${list.id}/run`}
                    className="btn-secondary h-8 px-2.5 text-xs"
                    aria-label={`Run ${list.name}`}
                  >
                    <Play size={13} /> Run
                  </Link>
                );
                return (
                  <SortableListRow
                    key={list.id}
                    id={list.id}
                    name={list.name}
                    subtitle={subtitle}
                    queryActive={queryActive}
                    runButton={runButton}
                    onDelete={() => onDelete(list)}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableListRow({
  id,
  name,
  subtitle,
  queryActive,
  runButton,
  onDelete,
}: {
  id: string;
  name: string;
  subtitle: string;
  queryActive: boolean;
  runButton: React.ReactNode;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: queryActive,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900"
    >
      <div className="flex items-center gap-2 px-3 pb-0.5 pt-3">
        {!queryActive && (
          <button
            type="button"
            {...listeners}
            className="shrink-0 touch-none cursor-grab text-ink-300 hover:text-ink-400 dark:text-ink-700 dark:hover:text-ink-500"
            aria-label="Drag to reorder"
          >
            <GripVertical size={16} />
          </button>
        )}
        <Link to={id} className="min-w-0 flex-1 truncate font-medium">
          {name}
        </Link>
      </div>
      <div className="flex items-center gap-1 px-2 pb-2">
        <div className="min-w-0 flex-1 truncate px-1 text-xs text-ink-500 dark:text-ink-400">
          {subtitle}
        </div>
        {runButton}
        <Link
          to={id}
          aria-label="Edit"
          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
        >
          <Pencil size={15} />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}
