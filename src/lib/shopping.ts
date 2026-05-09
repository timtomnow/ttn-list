import type {
  ShoppingGroup,
  ShoppingItem,
  ShoppingList,
  ShoppingListEntry,
  ShoppingResolvedItem,
} from '@/types';

/**
 * A row from a list-resolution pass — the same shape we hand to the run mode
 * (minus `checked`, which the run UI flips). Order is preserved from the
 * input list's entries; duplicates (same itemId across multiple entries) are
 * merged with summed quantities, keeping the position of the first
 * occurrence.
 */
export type ResolvedRow = {
  itemId: string;
  qty: number;
  /** First entry index that contributed to this row — for diagnostics / re-grouping. */
  fromEntryIdx: number;
  /** Set only for inline temp items — the name typed in the editor. */
  name?: string;
};

/**
 * Flatten a list's entries into a deduped, summed item-with-qty array.
 * Group entries expand to their members, multiplied by the entry's qty,
 * with `excludedItemIds` removed. Items missing from the library (deleted
 * after the list was saved) are dropped silently — the run mode will only
 * surface what currently exists.
 */
export function resolveShoppingList(
  list: ShoppingList,
  items: ShoppingItem[] | undefined,
  groups: ShoppingGroup[] | undefined,
): ResolvedRow[] {
  const itemIds = new Set((items ?? []).map((i) => i.id));
  const groupById = new Map((groups ?? []).map((g) => [g.id, g] as const));

  const order: string[] = []; // preserves first-seen item order
  const totals = new Map<string, ResolvedRow>();

  list.entries.forEach((entry, entryIdx) => {
    if (entry.kind === 'item') {
      if (!itemIds.has(entry.itemId)) return;
      addQty(entry.itemId, entry.qty, entryIdx, totals, order);
      return;
    }
    if (entry.kind === 'temp') {
      // tempId is uuid-unique, so this never collides/dedups with real items.
      totals.set(entry.tempId, { itemId: entry.tempId, qty: entry.qty, fromEntryIdx: entryIdx, name: entry.name });
      order.push(entry.tempId);
      return;
    }
    const group = groupById.get(entry.groupId);
    if (!group) return;
    const excluded = new Set(entry.excludedItemIds ?? []);
    for (const member of group.members) {
      if (excluded.has(member.itemId)) continue;
      if (!itemIds.has(member.itemId)) continue;
      addQty(member.itemId, entry.qty * member.defaultQty, entryIdx, totals, order);
    }
  });

  return order.map((id) => totals.get(id)!);
}

function addQty(
  itemId: string,
  qty: number,
  fromEntryIdx: number,
  totals: Map<string, ResolvedRow>,
  order: string[],
): void {
  const cur = totals.get(itemId);
  if (cur) {
    cur.qty += qty;
  } else {
    totals.set(itemId, { itemId, qty, fromEntryIdx });
    order.push(itemId);
  }
}

/** Convenience: resolved rows shaped for a `ShoppingSession.resolvedItems` seed. */
export function seedResolvedItems(rows: ResolvedRow[]): ShoppingResolvedItem[] {
  return rows.map((r) => ({ itemId: r.itemId, qty: r.qty, checked: false, ...(r.name ? { name: r.name } : {}) }));
}

/** Format quantities so 1 reads as "1", 1.5 reads as "1.5", 2.0 reads as "2". */
export function formatQty(q: number): string {
  if (Number.isInteger(q)) return String(q);
  return String(Math.round(q * 1000) / 1000);
}

/** Move an entry by delta in the list's entries array. Returns a new array. */
export function moveEntry(entries: ShoppingListEntry[], idx: number, dir: -1 | 1): ShoppingListEntry[] {
  const next = idx + dir;
  if (next < 0 || next >= entries.length) return entries;
  const out = entries.slice();
  const [m] = out.splice(idx, 1);
  out.splice(next, 0, m);
  return out;
}
