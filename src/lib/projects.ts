import type {
  ProjectListEntry,
  ProjectList,
  ProjectStep,
  ProjectProcess,
  ProjectResolvedStep,
} from '@/types';

/**
 * A row from project-list resolution. No quantity — project steps are
 * binary done / not-done. Order is preserved from the input list's entries;
 * duplicates (same stepId across multiple entries) are merged, keeping the
 * position of the first occurrence.
 */
export type ResolvedProjectRow = {
  stepId: string;
  fromEntryIdx: number;
  /** Set only for inline temp items — the name typed in the editor. */
  name?: string;
};

export function resolveProjectList(
  list: ProjectList,
  steps: ProjectStep[] | undefined,
  processes: ProjectProcess[] | undefined,
): ResolvedProjectRow[] {
  const stepIds = new Set((steps ?? []).map((s) => s.id));
  const processById = new Map((processes ?? []).map((p) => [p.id, p] as const));

  const order: string[] = [];
  const seen = new Map<string, ResolvedProjectRow>();

  list.entries.forEach((entry, entryIdx) => {
    if (entry.kind === 'step') {
      if (!stepIds.has(entry.stepId)) return;
      add(entry.stepId, entryIdx, seen, order);
      return;
    }
    if (entry.kind === 'temp') {
      // tempId is uuid-unique, so this never collides/dedups with real steps.
      seen.set(entry.tempId, { stepId: entry.tempId, fromEntryIdx: entryIdx, name: entry.name });
      order.push(entry.tempId);
      return;
    }
    const process = processById.get(entry.processId);
    if (!process) return;
    const excluded = new Set(entry.excludedStepIds ?? []);
    for (const member of process.members) {
      if (excluded.has(member.stepId)) continue;
      if (!stepIds.has(member.stepId)) continue;
      add(member.stepId, entryIdx, seen, order);
    }
  });

  return order.map((id) => seen.get(id)!);
}

function add(
  stepId: string,
  fromEntryIdx: number,
  seen: Map<string, ResolvedProjectRow>,
  order: string[],
): void {
  if (seen.has(stepId)) return;
  seen.set(stepId, { stepId, fromEntryIdx });
  order.push(stepId);
}

export function seedResolvedProjectSteps(rows: ResolvedProjectRow[]): ProjectResolvedStep[] {
  return rows.map((r) => ({ stepId: r.stepId, checked: false, ...(r.name ? { name: r.name } : {}) }));
}

export function moveProjectEntry(
  entries: ProjectListEntry[],
  idx: number,
  dir: -1 | 1,
): ProjectListEntry[] {
  const next = idx + dir;
  if (next < 0 || next >= entries.length) return entries;
  const out = entries.slice();
  const [m] = out.splice(idx, 1);
  out.splice(next, 0, m);
  return out;
}
