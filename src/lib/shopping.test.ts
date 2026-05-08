import { describe, expect, it } from 'vitest';
import type {
  ShoppingGroup,
  ShoppingItem,
  ShoppingList,
  ShoppingListEntry,
} from '@/types';
import { formatQty, moveEntry, resolveShoppingList } from './shopping';

// Helpers — tests only need these fields populated. The resolver doesn't
// touch createdAt/updatedAt/order/photoId so we leave them as defaults.
const item = (id: string, name = id): ShoppingItem => ({
  id, name, order: 0, createdAt: 0, updatedAt: 0,
});
const group = (id: string, members: { itemId: string; defaultQty: number }[]): ShoppingGroup => ({
  id, name: id, members, order: 0, createdAt: 0, updatedAt: 0,
});
const list = (entries: ShoppingListEntry[]): ShoppingList => ({
  id: 'L', name: 'L', entries, order: 0, createdAt: 0, updatedAt: 0,
});

describe('resolveShoppingList', () => {
  it('returns empty for an empty list', () => {
    expect(resolveShoppingList(list([]), [], [])).toEqual([]);
  });

  it('passes through a single item entry with its qty', () => {
    const items = [item('milk')];
    const result = resolveShoppingList(
      list([{ kind: 'item', itemId: 'milk', qty: 2 }]),
      items,
      [],
    );
    expect(result).toEqual([{ itemId: 'milk', qty: 2, fromEntryIdx: 0 }]);
  });

  it('expands a group entry by qty * defaultQty', () => {
    const items = [item('tortilla'), item('beef')];
    const tacoNight = group('taco-night', [
      { itemId: 'tortilla', defaultQty: 8 },
      { itemId: 'beef', defaultQty: 1 },
    ]);
    const result = resolveShoppingList(
      list([{ kind: 'group', groupId: 'taco-night', qty: 2 }]),
      items,
      [tacoNight],
    );
    expect(result).toEqual([
      { itemId: 'tortilla', qty: 16, fromEntryIdx: 0 },
      { itemId: 'beef', qty: 2, fromEntryIdx: 0 },
    ]);
  });

  it('respects excludedItemIds on a group entry', () => {
    const items = [item('tortilla'), item('beef'), item('lettuce')];
    const dinner = group('dinner', [
      { itemId: 'tortilla', defaultQty: 8 },
      { itemId: 'beef', defaultQty: 1 },
      { itemId: 'lettuce', defaultQty: 1 },
    ]);
    const result = resolveShoppingList(
      list([{ kind: 'group', groupId: 'dinner', qty: 1, excludedItemIds: ['lettuce'] }]),
      items,
      [dinner],
    );
    expect(result.map((r) => r.itemId)).toEqual(['tortilla', 'beef']);
  });

  it('sums qty when an item appears across multiple entries', () => {
    const items = [item('milk')];
    const result = resolveShoppingList(
      list([
        { kind: 'item', itemId: 'milk', qty: 1 },
        { kind: 'item', itemId: 'milk', qty: 2.5 },
      ]),
      items,
      [],
    );
    expect(result).toEqual([{ itemId: 'milk', qty: 3.5, fromEntryIdx: 0 }]);
  });

  it('sums across an item entry AND a group entry that shares the item', () => {
    const items = [item('milk'), item('cereal')];
    const breakfast = group('breakfast', [
      { itemId: 'milk', defaultQty: 1 },
      { itemId: 'cereal', defaultQty: 1 },
    ]);
    const result = resolveShoppingList(
      list([
        { kind: 'item', itemId: 'milk', qty: 1 },
        { kind: 'group', groupId: 'breakfast', qty: 2 },
      ]),
      items,
      [breakfast],
    );
    // milk: 1 (free) + 2 * 1 (group) = 3, comes first by entry order.
    // cereal: 2 * 1 = 2, comes second.
    expect(result).toEqual([
      { itemId: 'milk', qty: 3, fromEntryIdx: 0 },
      { itemId: 'cereal', qty: 2, fromEntryIdx: 1 },
    ]);
  });

  it('preserves the order of first occurrence', () => {
    const items = [item('a'), item('b'), item('c')];
    const result = resolveShoppingList(
      list([
        { kind: 'item', itemId: 'b', qty: 1 },
        { kind: 'item', itemId: 'a', qty: 1 },
        { kind: 'item', itemId: 'c', qty: 1 },
        { kind: 'item', itemId: 'a', qty: 1 }, // duplicate; should fold into first 'a'
      ]),
      items,
      [],
    );
    expect(result.map((r) => r.itemId)).toEqual(['b', 'a', 'c']);
    expect(result.find((r) => r.itemId === 'a')!.qty).toBe(2);
  });

  it('drops item entries whose itemId is no longer in the library', () => {
    const items = [item('milk')]; // 'gone' was deleted
    const result = resolveShoppingList(
      list([
        { kind: 'item', itemId: 'milk', qty: 1 },
        { kind: 'item', itemId: 'gone', qty: 99 },
      ]),
      items,
      [],
    );
    expect(result).toEqual([{ itemId: 'milk', qty: 1, fromEntryIdx: 0 }]);
  });

  it('drops group entries whose groupId is no longer in the library', () => {
    const items = [item('milk')];
    const result = resolveShoppingList(
      list([
        { kind: 'group', groupId: 'gone', qty: 1 },
        { kind: 'item', itemId: 'milk', qty: 1 },
      ]),
      items,
      [],
    );
    expect(result.map((r) => r.itemId)).toEqual(['milk']);
  });

  it('drops group members whose itemId is missing from the library', () => {
    const items = [item('milk')];
    const half = group('half', [
      { itemId: 'milk', defaultQty: 1 },
      { itemId: 'gone', defaultQty: 1 },
    ]);
    const result = resolveShoppingList(
      list([{ kind: 'group', groupId: 'half', qty: 1 }]),
      items,
      [half],
    );
    expect(result).toEqual([{ itemId: 'milk', qty: 1, fromEntryIdx: 0 }]);
  });

  it('handles undefined items / groups gracefully (live-query loading)', () => {
    expect(resolveShoppingList(list([]), undefined, undefined)).toEqual([]);
  });

  it('handles fractional defaultQty without precision drift on simple cases', () => {
    const items = [item('flour')];
    const recipe = group('recipe', [{ itemId: 'flour', defaultQty: 0.5 }]);
    const result = resolveShoppingList(
      list([{ kind: 'group', groupId: 'recipe', qty: 4 }]),
      items,
      [recipe],
    );
    expect(result[0].qty).toBe(2);
  });
});

describe('formatQty', () => {
  it('renders integers without decimals', () => {
    expect(formatQty(1)).toBe('1');
    expect(formatQty(2)).toBe('2');
    expect(formatQty(0)).toBe('0');
  });
  it('renders fractional numbers compactly', () => {
    expect(formatQty(1.5)).toBe('1.5');
    expect(formatQty(0.25)).toBe('0.25');
  });
  it('rounds tiny floating-point dust', () => {
    expect(formatQty(0.1 + 0.2)).toBe('0.3'); // would be 0.30000000000000004 raw
  });
});

describe('moveEntry', () => {
  const e = (kind: 'item', itemId: string): ShoppingListEntry =>
    ({ kind, itemId, qty: 1 }) as ShoppingListEntry;

  it('moves an entry up', () => {
    const before = [e('item', 'a'), e('item', 'b'), e('item', 'c')];
    const after = moveEntry(before, 1, -1);
    expect(after.map((x) => (x as { itemId: string }).itemId)).toEqual(['b', 'a', 'c']);
  });

  it('moves an entry down', () => {
    const before = [e('item', 'a'), e('item', 'b'), e('item', 'c')];
    const after = moveEntry(before, 1, 1);
    expect(after.map((x) => (x as { itemId: string }).itemId)).toEqual(['a', 'c', 'b']);
  });

  it('returns the input unchanged at boundaries', () => {
    const arr = [e('item', 'a'), e('item', 'b')];
    expect(moveEntry(arr, 0, -1)).toBe(arr);
    expect(moveEntry(arr, 1, 1)).toBe(arr);
  });
});
