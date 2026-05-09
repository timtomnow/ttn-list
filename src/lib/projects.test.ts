import { describe, expect, it } from 'vitest';
import type {
  ProjectList,
  ProjectListEntry,
  ProjectProcess,
  ProjectStep,
} from '@/types';
import { moveProjectEntry, resolveProjectList } from './projects';

const step = (id: string): ProjectStep => ({ id, name: id, order: 0, createdAt: 0, updatedAt: 0 });
const process = (id: string, members: { stepId: string }[]): ProjectProcess => ({
  id, name: id, members, order: 0, createdAt: 0, updatedAt: 0,
});
const list = (entries: ProjectListEntry[]): ProjectList => ({
  id: 'L', name: 'L', entries, order: 0, createdAt: 0, updatedAt: 0,
});

describe('resolveProjectList', () => {
  it('returns empty for an empty list', () => {
    expect(resolveProjectList(list([]), [], [])).toEqual([]);
  });

  it('passes through a single step entry', () => {
    const steps = [step('sand')];
    const result = resolveProjectList(
      list([{ kind: 'step', stepId: 'sand' }]),
      steps,
      [],
    );
    expect(result).toEqual([{ stepId: 'sand', fromEntryIdx: 0 }]);
  });

  it('expands a process entry into its members', () => {
    const steps = [step('sand'), step('prime'), step('paint')];
    const finish = process('finish', [
      { stepId: 'sand' }, { stepId: 'prime' }, { stepId: 'paint' },
    ]);
    const result = resolveProjectList(
      list([{ kind: 'process', processId: 'finish' }]),
      steps,
      [finish],
    );
    expect(result.map((r) => r.stepId)).toEqual(['sand', 'prime', 'paint']);
  });

  it('respects excludedStepIds on a process entry', () => {
    const steps = [step('sand'), step('prime'), step('paint')];
    const finish = process('finish', [
      { stepId: 'sand' }, { stepId: 'prime' }, { stepId: 'paint' },
    ]);
    const result = resolveProjectList(
      list([{ kind: 'process', processId: 'finish', excludedStepIds: ['prime'] }]),
      steps,
      [finish],
    );
    expect(result.map((r) => r.stepId)).toEqual(['sand', 'paint']);
  });

  it('dedupes a step that appears as both a free entry and inside a process', () => {
    const steps = [step('a'), step('b')];
    const proc = process('p', [{ stepId: 'a' }, { stepId: 'b' }]);
    const result = resolveProjectList(
      list([
        { kind: 'step', stepId: 'a' },
        { kind: 'process', processId: 'p' },
      ]),
      steps,
      [proc],
    );
    expect(result.map((r) => r.stepId)).toEqual(['a', 'b']);
  });

  it('preserves the order of first occurrence', () => {
    const steps = [step('a'), step('b'), step('c')];
    const proc = process('p', [{ stepId: 'b' }, { stepId: 'a' }]);
    const result = resolveProjectList(
      list([
        { kind: 'step', stepId: 'c' },
        { kind: 'process', processId: 'p' }, // order: b, then a; both fold in
      ]),
      steps,
      [proc],
    );
    expect(result.map((r) => r.stepId)).toEqual(['c', 'b', 'a']);
  });

  it('drops step entries whose stepId is no longer in the library', () => {
    const steps = [step('a')];
    const result = resolveProjectList(
      list([
        { kind: 'step', stepId: 'a' },
        { kind: 'step', stepId: 'gone' },
      ]),
      steps,
      [],
    );
    expect(result.map((r) => r.stepId)).toEqual(['a']);
  });

  it('drops process entries whose processId is no longer in the library', () => {
    const steps = [step('a')];
    const result = resolveProjectList(
      list([
        { kind: 'process', processId: 'gone' },
        { kind: 'step', stepId: 'a' },
      ]),
      steps,
      [],
    );
    expect(result.map((r) => r.stepId)).toEqual(['a']);
  });

  it('passes through a temp entry with its name', () => {
    const result = resolveProjectList(
      list([{ kind: 'temp', tempId: 't1', name: 'pick up paint' }]),
      [],
      [],
    );
    expect(result).toEqual([{ stepId: 't1', fromEntryIdx: 0, name: 'pick up paint' }]);
  });

  it('does not dedup temp entries even when names match', () => {
    const result = resolveProjectList(
      list([
        { kind: 'temp', tempId: 't1', name: 'measure' },
        { kind: 'temp', tempId: 't2', name: 'measure' },
      ]),
      [],
      [],
    );
    expect(result.map((r) => r.stepId)).toEqual(['t1', 't2']);
  });

  it('handles undefined steps/processes gracefully', () => {
    expect(resolveProjectList(list([]), undefined, undefined)).toEqual([]);
  });
});

describe('moveProjectEntry', () => {
  const e = (id: string): ProjectListEntry => ({ kind: 'step', stepId: id });

  it('moves up and down', () => {
    const arr = [e('a'), e('b'), e('c')];
    expect(moveProjectEntry(arr, 1, -1).map((x) => (x as { stepId: string }).stepId)).toEqual(['b', 'a', 'c']);
    expect(moveProjectEntry(arr, 1, 1).map((x) => (x as { stepId: string }).stepId)).toEqual(['a', 'c', 'b']);
  });

  it('returns the input unchanged at boundaries', () => {
    const arr = [e('a'), e('b')];
    expect(moveProjectEntry(arr, 0, -1)).toBe(arr);
    expect(moveProjectEntry(arr, 1, 1)).toBe(arr);
  });
});
