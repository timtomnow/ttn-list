import { describe, expect, it } from 'vitest';
import type { ChoreItem, ChoreList, ChoreListEntry, ChoreRoutine } from '@/types';
import { moveChoreEntry, resolveChoreList } from './chores';

const item = (id: string): ChoreItem => ({ id, name: id, order: 0, createdAt: 0, updatedAt: 0 });
const routine = (id: string, members: { itemId: string }[]): ChoreRoutine => ({
  id, name: id, members, order: 0, createdAt: 0, updatedAt: 0,
});
const list = (entries: ChoreListEntry[]): ChoreList => ({
  id: 'L', name: 'L', entries, order: 0, createdAt: 0, updatedAt: 0,
});

describe('resolveChoreList', () => {
  it('returns empty for an empty list', () => {
    expect(resolveChoreList(list([]), [], [])).toEqual([]);
  });

  it('passes through a single item entry (no qty)', () => {
    const items = [item('wipe-counter')];
    const result = resolveChoreList(
      list([{ kind: 'item', itemId: 'wipe-counter' }]),
      items,
      [],
    );
    expect(result).toEqual([{ itemId: 'wipe-counter', fromEntryIdx: 0 }]);
  });

  it('expands a routine entry into its members', () => {
    const items = [item('a'), item('b')];
    const morning = routine('morning', [{ itemId: 'a' }, { itemId: 'b' }]);
    const result = resolveChoreList(
      list([{ kind: 'routine', routineId: 'morning' }]),
      items,
      [morning],
    );
    expect(result.map((r) => r.itemId)).toEqual(['a', 'b']);
  });

  it('respects excludedItemIds on a routine entry', () => {
    const items = [item('a'), item('b'), item('c')];
    const r = routine('all', [{ itemId: 'a' }, { itemId: 'b' }, { itemId: 'c' }]);
    const result = resolveChoreList(
      list([{ kind: 'routine', routineId: 'all', excludedItemIds: ['b'] }]),
      items,
      [r],
    );
    expect(result.map((x) => x.itemId)).toEqual(['a', 'c']);
  });

  it('dedupes when an item appears in both an item-entry and a routine-entry', () => {
    const items = [item('a'), item('b')];
    const r = routine('r', [{ itemId: 'a' }, { itemId: 'b' }]);
    const result = resolveChoreList(
      list([
        { kind: 'item', itemId: 'a' },
        { kind: 'routine', routineId: 'r' },
      ]),
      items,
      [r],
    );
    // 'a' first (from the item entry), then 'b' from the routine. No duplicate of 'a'.
    expect(result.map((x) => x.itemId)).toEqual(['a', 'b']);
  });

  it('preserves order of first occurrence across re-references', () => {
    const items = [item('a'), item('b')];
    const r = routine('r', [{ itemId: 'b' }, { itemId: 'a' }]);
    const result = resolveChoreList(
      list([
        { kind: 'item', itemId: 'a' },
        { kind: 'routine', routineId: 'r' }, // contains b, a — but a is already seen, b is new
      ]),
      items,
      [r],
    );
    expect(result.map((x) => x.itemId)).toEqual(['a', 'b']);
  });

  it('drops item entries whose itemId is no longer in the library', () => {
    const items = [item('a')];
    const result = resolveChoreList(
      list([
        { kind: 'item', itemId: 'a' },
        { kind: 'item', itemId: 'gone' },
      ]),
      items,
      [],
    );
    expect(result.map((x) => x.itemId)).toEqual(['a']);
  });

  it('drops routine entries whose routineId is no longer in the library', () => {
    const items = [item('a')];
    const result = resolveChoreList(
      list([
        { kind: 'routine', routineId: 'gone' },
        { kind: 'item', itemId: 'a' },
      ]),
      items,
      [],
    );
    expect(result.map((x) => x.itemId)).toEqual(['a']);
  });

  it('passes through a temp entry with its name', () => {
    const result = resolveChoreList(
      list([{ kind: 'temp', tempId: 't1', name: 'wipe stove' }]),
      [],
      [],
    );
    expect(result).toEqual([{ itemId: 't1', fromEntryIdx: 0, name: 'wipe stove' }]);
  });

  it('does not dedup temp entries even when names match', () => {
    const result = resolveChoreList(
      list([
        { kind: 'temp', tempId: 't1', name: 'sweep' },
        { kind: 'temp', tempId: 't2', name: 'sweep' },
      ]),
      [],
      [],
    );
    expect(result.map((r) => r.itemId)).toEqual(['t1', 't2']);
  });

  it('handles undefined items/routines gracefully', () => {
    expect(resolveChoreList(list([]), undefined, undefined)).toEqual([]);
  });
});

describe('moveChoreEntry', () => {
  const e = (id: string): ChoreListEntry => ({ kind: 'item', itemId: id });

  it('moves up and down', () => {
    const arr = [e('a'), e('b'), e('c')];
    expect(moveChoreEntry(arr, 1, -1).map((x) => (x as { itemId: string }).itemId)).toEqual(['b', 'a', 'c']);
    expect(moveChoreEntry(arr, 1, 1).map((x) => (x as { itemId: string }).itemId)).toEqual(['a', 'c', 'b']);
  });

  it('returns the input unchanged at boundaries', () => {
    const arr = [e('a'), e('b')];
    expect(moveChoreEntry(arr, 0, -1)).toBe(arr);
    expect(moveChoreEntry(arr, 1, 1)).toBe(arr);
  });
});
