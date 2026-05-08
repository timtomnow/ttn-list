import type {
  ChoreListEntry,
  ChoreList,
  ChoreItem,
  ChoreRoutine,
  ChoreResolvedItem,
} from '@/types';

/**
 * A row from chore-list resolution. No quantity — chores are binary
 * done / not-done. Order is preserved from the input list's entries;
 * duplicates (same itemId across multiple entries) are merged, keeping
 * the position of the first occurrence.
 */
export type ResolvedChoreRow = {
  itemId: string;
  fromEntryIdx: number;
};

/**
 * Flatten a chore list's entries into a deduped, ordered list of itemIds.
 * Routine entries expand to their members minus `excludedItemIds`. Items
 * missing from the library (deleted after the list was saved) are dropped
 * silently.
 */
export function resolveChoreList(
  list: ChoreList,
  items: ChoreItem[] | undefined,
  routines: ChoreRoutine[] | undefined,
): ResolvedChoreRow[] {
  const itemIds = new Set((items ?? []).map((i) => i.id));
  const routineById = new Map((routines ?? []).map((r) => [r.id, r] as const));

  const order: string[] = [];
  const seen = new Map<string, ResolvedChoreRow>();

  list.entries.forEach((entry, entryIdx) => {
    if (entry.kind === 'item') {
      if (!itemIds.has(entry.itemId)) return;
      add(entry.itemId, entryIdx, seen, order);
      return;
    }
    const routine = routineById.get(entry.routineId);
    if (!routine) return;
    const excluded = new Set(entry.excludedItemIds ?? []);
    for (const member of routine.members) {
      if (excluded.has(member.itemId)) continue;
      if (!itemIds.has(member.itemId)) continue;
      add(member.itemId, entryIdx, seen, order);
    }
  });

  return order.map((id) => seen.get(id)!);
}

function add(
  itemId: string,
  fromEntryIdx: number,
  seen: Map<string, ResolvedChoreRow>,
  order: string[],
): void {
  if (seen.has(itemId)) return;
  seen.set(itemId, { itemId, fromEntryIdx });
  order.push(itemId);
}

export function seedResolvedChoreItems(rows: ResolvedChoreRow[]): ChoreResolvedItem[] {
  return rows.map((r) => ({ itemId: r.itemId, checked: false }));
}

export function moveChoreEntry(
  entries: ChoreListEntry[],
  idx: number,
  dir: -1 | 1,
): ChoreListEntry[] {
  const next = idx + dir;
  if (next < 0 || next >= entries.length) return entries;
  const out = entries.slice();
  const [m] = out.splice(idx, 1);
  out.splice(next, 0, m);
  return out;
}
