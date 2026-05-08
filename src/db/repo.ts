import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';
import { newId } from '@/lib/id';
import type {
  ChoreItem,
  ChoreList,
  ChoreRoutine,
  ChoreSession,
  Photo,
  ProjectList,
  ProjectProcess,
  ProjectSession,
  ProjectStep,
  ShoppingGroup,
  ShoppingItem,
  ShoppingList,
  ShoppingSession,
} from '@/types';

// =============================================================================
// Photos
// =============================================================================
//
// Photos are stored as Blobs (not base64) so IndexedDB can persist them
// efficiently. The view layer renders thumbnails via `URL.createObjectURL` and
// is responsible for revoking the URL on unmount.

export async function addPhoto(blob: Blob): Promise<Photo> {
  const photo: Photo = {
    id: newId(),
    blob,
    mime: blob.type || 'image/jpeg',
    createdAt: Date.now(),
  };
  await db.photos.add(photo);
  return photo;
}

export async function getPhoto(id: string | null | undefined): Promise<Photo | undefined> {
  if (!id) return undefined;
  return db.photos.get(id);
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}

export function usePhoto(id: string | null | undefined): Photo | undefined {
  return useLiveQuery(async () => (id ? await db.photos.get(id) : undefined), [id]);
}

// =============================================================================
// Shopping — Items
// =============================================================================

export async function createShoppingItem(
  input: Omit<ShoppingItem, 'id' | 'order' | 'createdAt' | 'updatedAt'>,
): Promise<ShoppingItem> {
  const now = Date.now();
  const order = await nextOrder(() => db.shoppingItems.orderBy('order').last());
  const item: ShoppingItem = { ...input, id: newId(), order, createdAt: now, updatedAt: now };
  await db.shoppingItems.add(item);
  return item;
}

export async function updateShoppingItem(id: string, patch: Partial<ShoppingItem>): Promise<void> {
  await db.shoppingItems.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteShoppingItem(id: string): Promise<void> {
  await db.shoppingItems.delete(id);
}

export function useShoppingItems(): ShoppingItem[] | undefined {
  return useLiveQuery(() => db.shoppingItems.orderBy('order').toArray(), []);
}

export function useShoppingItem(id: string | null | undefined): ShoppingItem | undefined {
  return useLiveQuery(async () => (id ? await db.shoppingItems.get(id) : undefined), [id]);
}

// =============================================================================
// Shopping — Groups
// =============================================================================

export async function createShoppingGroup(
  input: Omit<ShoppingGroup, 'id' | 'order' | 'createdAt' | 'updatedAt'>,
): Promise<ShoppingGroup> {
  const now = Date.now();
  const order = await nextOrder(() => db.shoppingGroups.orderBy('order').last());
  const group: ShoppingGroup = { ...input, id: newId(), order, createdAt: now, updatedAt: now };
  await db.shoppingGroups.add(group);
  return group;
}

export async function updateShoppingGroup(id: string, patch: Partial<ShoppingGroup>): Promise<void> {
  await db.shoppingGroups.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteShoppingGroup(id: string): Promise<void> {
  await db.shoppingGroups.delete(id);
}

export function useShoppingGroups(): ShoppingGroup[] | undefined {
  return useLiveQuery(() => db.shoppingGroups.orderBy('order').toArray(), []);
}

export function useShoppingGroup(id: string | null | undefined): ShoppingGroup | undefined {
  return useLiveQuery(async () => (id ? await db.shoppingGroups.get(id) : undefined), [id]);
}

// =============================================================================
// Shopping — Lists
// =============================================================================

export async function createShoppingList(
  input: Omit<ShoppingList, 'id' | 'order' | 'createdAt' | 'updatedAt'>,
): Promise<ShoppingList> {
  const now = Date.now();
  const order = await nextOrder(() => db.shoppingLists.orderBy('order').last());
  const list: ShoppingList = { ...input, id: newId(), order, createdAt: now, updatedAt: now };
  await db.shoppingLists.add(list);
  return list;
}

export async function updateShoppingList(id: string, patch: Partial<ShoppingList>): Promise<void> {
  await db.shoppingLists.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteShoppingList(id: string): Promise<void> {
  await db.shoppingLists.delete(id);
}

export function useShoppingLists(): ShoppingList[] | undefined {
  return useLiveQuery(() => db.shoppingLists.orderBy('order').toArray(), []);
}

export function useShoppingList(id: string | null | undefined): ShoppingList | undefined {
  return useLiveQuery(async () => (id ? await db.shoppingLists.get(id) : undefined), [id]);
}

// =============================================================================
// Shopping — Sessions
// =============================================================================

export async function createShoppingSession(
  input: Omit<ShoppingSession, 'id'>,
): Promise<ShoppingSession> {
  const session: ShoppingSession = { ...input, id: newId() };
  await db.shoppingSessions.add(session);
  return session;
}

export async function updateShoppingSession(
  id: string,
  patch: Partial<ShoppingSession>,
): Promise<void> {
  await db.shoppingSessions.update(id, patch);
}

export async function deleteShoppingSession(id: string): Promise<void> {
  await db.shoppingSessions.delete(id);
}

export function useShoppingSessions(opts?: { listId?: string; limit?: number }): ShoppingSession[] | undefined {
  const listId = opts?.listId;
  const limit = opts?.limit;
  return useLiveQuery(async () => {
    const arr = listId
      ? await db.shoppingSessions.where('listId').equals(listId).toArray()
      : await db.shoppingSessions.toArray();
    arr.sort((a, b) => b.startedAt - a.startedAt);
    return limit ? arr.slice(0, limit) : arr;
  }, [listId, limit]);
}

export function useShoppingSession(id: string | null | undefined): ShoppingSession | undefined {
  return useLiveQuery(async () => (id ? await db.shoppingSessions.get(id) : undefined), [id]);
}

/**
 * All in-progress shopping sessions (any list). Used by the Lists page to
 * surface a "Continue" affordance per list. We filter in memory rather than
 * indexing `completedAt` because IndexedDB can't index "is undefined".
 */
export function useInProgressShoppingSessions(): ShoppingSession[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.shoppingSessions.toArray();
    return all.filter((s) => s.completedAt === undefined);
  }, []);
}

/** One-shot lookup for the most recent in-progress session for a given list. */
export async function findInProgressShoppingSession(
  listId: string,
): Promise<ShoppingSession | undefined> {
  const all = await db.shoppingSessions.where('listId').equals(listId).toArray();
  const inProgress = all.filter((s) => s.completedAt === undefined);
  inProgress.sort((a, b) => b.startedAt - a.startedAt);
  return inProgress[0];
}

export function useInProgressChoreSessions(): ChoreSession[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.choreSessions.toArray();
    return all.filter((s) => s.completedAt === undefined);
  }, []);
}

export async function findInProgressChoreSession(
  listId: string,
): Promise<ChoreSession | undefined> {
  const all = await db.choreSessions.where('listId').equals(listId).toArray();
  const inProgress = all.filter((s) => s.completedAt === undefined);
  inProgress.sort((a, b) => b.startedAt - a.startedAt);
  return inProgress[0];
}

export function useInProgressProjectSessions(): ProjectSession[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.projectSessions.toArray();
    return all.filter((s) => s.completedAt === undefined);
  }, []);
}

export async function findInProgressProjectSession(
  listId: string,
): Promise<ProjectSession | undefined> {
  const all = await db.projectSessions.where('listId').equals(listId).toArray();
  const inProgress = all.filter((s) => s.completedAt === undefined);
  inProgress.sort((a, b) => b.startedAt - a.startedAt);
  return inProgress[0];
}

// =============================================================================
// Chores — Items
// =============================================================================

export async function createChoreItem(
  input: Omit<ChoreItem, 'id' | 'order' | 'createdAt' | 'updatedAt'>,
): Promise<ChoreItem> {
  const now = Date.now();
  const order = await nextOrder(() => db.choreItems.orderBy('order').last());
  const item: ChoreItem = { ...input, id: newId(), order, createdAt: now, updatedAt: now };
  await db.choreItems.add(item);
  return item;
}

export async function updateChoreItem(id: string, patch: Partial<ChoreItem>): Promise<void> {
  await db.choreItems.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteChoreItem(id: string): Promise<void> {
  await db.choreItems.delete(id);
}

export function useChoreItems(): ChoreItem[] | undefined {
  return useLiveQuery(() => db.choreItems.orderBy('order').toArray(), []);
}

export function useChoreItem(id: string | null | undefined): ChoreItem | undefined {
  return useLiveQuery(async () => (id ? await db.choreItems.get(id) : undefined), [id]);
}

// =============================================================================
// Chores — Routines
// =============================================================================

export async function createChoreRoutine(
  input: Omit<ChoreRoutine, 'id' | 'order' | 'createdAt' | 'updatedAt'>,
): Promise<ChoreRoutine> {
  const now = Date.now();
  const order = await nextOrder(() => db.choreRoutines.orderBy('order').last());
  const routine: ChoreRoutine = { ...input, id: newId(), order, createdAt: now, updatedAt: now };
  await db.choreRoutines.add(routine);
  return routine;
}

export async function updateChoreRoutine(id: string, patch: Partial<ChoreRoutine>): Promise<void> {
  await db.choreRoutines.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteChoreRoutine(id: string): Promise<void> {
  await db.choreRoutines.delete(id);
}

export function useChoreRoutines(): ChoreRoutine[] | undefined {
  return useLiveQuery(() => db.choreRoutines.orderBy('order').toArray(), []);
}

export function useChoreRoutine(id: string | null | undefined): ChoreRoutine | undefined {
  return useLiveQuery(async () => (id ? await db.choreRoutines.get(id) : undefined), [id]);
}

// =============================================================================
// Chores — Lists
// =============================================================================

export async function createChoreList(
  input: Omit<ChoreList, 'id' | 'order' | 'createdAt' | 'updatedAt'>,
): Promise<ChoreList> {
  const now = Date.now();
  const order = await nextOrder(() => db.choreLists.orderBy('order').last());
  const list: ChoreList = { ...input, id: newId(), order, createdAt: now, updatedAt: now };
  await db.choreLists.add(list);
  return list;
}

export async function updateChoreList(id: string, patch: Partial<ChoreList>): Promise<void> {
  await db.choreLists.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteChoreList(id: string): Promise<void> {
  await db.choreLists.delete(id);
}

export function useChoreLists(): ChoreList[] | undefined {
  return useLiveQuery(() => db.choreLists.orderBy('order').toArray(), []);
}

export function useChoreList(id: string | null | undefined): ChoreList | undefined {
  return useLiveQuery(async () => (id ? await db.choreLists.get(id) : undefined), [id]);
}

// =============================================================================
// Chores — Sessions
// =============================================================================

export async function createChoreSession(input: Omit<ChoreSession, 'id'>): Promise<ChoreSession> {
  const session: ChoreSession = { ...input, id: newId() };
  await db.choreSessions.add(session);
  return session;
}

export async function updateChoreSession(id: string, patch: Partial<ChoreSession>): Promise<void> {
  await db.choreSessions.update(id, patch);
}

export async function deleteChoreSession(id: string): Promise<void> {
  await db.choreSessions.delete(id);
}

export function useChoreSessions(opts?: { listId?: string; limit?: number }): ChoreSession[] | undefined {
  const listId = opts?.listId;
  const limit = opts?.limit;
  return useLiveQuery(async () => {
    const arr = listId
      ? await db.choreSessions.where('listId').equals(listId).toArray()
      : await db.choreSessions.toArray();
    arr.sort((a, b) => b.startedAt - a.startedAt);
    return limit ? arr.slice(0, limit) : arr;
  }, [listId, limit]);
}

export function useChoreSession(id: string | null | undefined): ChoreSession | undefined {
  return useLiveQuery(async () => (id ? await db.choreSessions.get(id) : undefined), [id]);
}

// =============================================================================
// Projects — Steps
// =============================================================================

export async function createProjectStep(
  input: Omit<ProjectStep, 'id' | 'order' | 'createdAt' | 'updatedAt'>,
): Promise<ProjectStep> {
  const now = Date.now();
  const order = await nextOrder(() => db.projectSteps.orderBy('order').last());
  const step: ProjectStep = { ...input, id: newId(), order, createdAt: now, updatedAt: now };
  await db.projectSteps.add(step);
  return step;
}

export async function updateProjectStep(id: string, patch: Partial<ProjectStep>): Promise<void> {
  await db.projectSteps.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteProjectStep(id: string): Promise<void> {
  await db.projectSteps.delete(id);
}

export function useProjectSteps(): ProjectStep[] | undefined {
  return useLiveQuery(() => db.projectSteps.orderBy('order').toArray(), []);
}

export function useProjectStep(id: string | null | undefined): ProjectStep | undefined {
  return useLiveQuery(async () => (id ? await db.projectSteps.get(id) : undefined), [id]);
}

// =============================================================================
// Projects — Processes
// =============================================================================

export async function createProjectProcess(
  input: Omit<ProjectProcess, 'id' | 'order' | 'createdAt' | 'updatedAt'>,
): Promise<ProjectProcess> {
  const now = Date.now();
  const order = await nextOrder(() => db.projectProcesses.orderBy('order').last());
  const process: ProjectProcess = { ...input, id: newId(), order, createdAt: now, updatedAt: now };
  await db.projectProcesses.add(process);
  return process;
}

export async function updateProjectProcess(
  id: string,
  patch: Partial<ProjectProcess>,
): Promise<void> {
  await db.projectProcesses.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteProjectProcess(id: string): Promise<void> {
  await db.projectProcesses.delete(id);
}

export function useProjectProcesses(): ProjectProcess[] | undefined {
  return useLiveQuery(() => db.projectProcesses.orderBy('order').toArray(), []);
}

export function useProjectProcess(id: string | null | undefined): ProjectProcess | undefined {
  return useLiveQuery(async () => (id ? await db.projectProcesses.get(id) : undefined), [id]);
}

// =============================================================================
// Projects — Lists
// =============================================================================

export async function createProjectList(
  input: Omit<ProjectList, 'id' | 'order' | 'createdAt' | 'updatedAt'>,
): Promise<ProjectList> {
  const now = Date.now();
  const order = await nextOrder(() => db.projectLists.orderBy('order').last());
  const list: ProjectList = { ...input, id: newId(), order, createdAt: now, updatedAt: now };
  await db.projectLists.add(list);
  return list;
}

export async function updateProjectList(id: string, patch: Partial<ProjectList>): Promise<void> {
  await db.projectLists.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteProjectList(id: string): Promise<void> {
  await db.projectLists.delete(id);
}

export function useProjectLists(): ProjectList[] | undefined {
  return useLiveQuery(() => db.projectLists.orderBy('order').toArray(), []);
}

export function useProjectList(id: string | null | undefined): ProjectList | undefined {
  return useLiveQuery(async () => (id ? await db.projectLists.get(id) : undefined), [id]);
}

// =============================================================================
// Projects — Sessions
// =============================================================================

export async function createProjectSession(
  input: Omit<ProjectSession, 'id'>,
): Promise<ProjectSession> {
  const session: ProjectSession = { ...input, id: newId() };
  await db.projectSessions.add(session);
  return session;
}

export async function updateProjectSession(
  id: string,
  patch: Partial<ProjectSession>,
): Promise<void> {
  await db.projectSessions.update(id, patch);
}

export async function deleteProjectSession(id: string): Promise<void> {
  await db.projectSessions.delete(id);
}

export function useProjectSessions(opts?: { listId?: string; limit?: number }): ProjectSession[] | undefined {
  const listId = opts?.listId;
  const limit = opts?.limit;
  return useLiveQuery(async () => {
    const arr = listId
      ? await db.projectSessions.where('listId').equals(listId).toArray()
      : await db.projectSessions.toArray();
    arr.sort((a, b) => b.startedAt - a.startedAt);
    return limit ? arr.slice(0, limit) : arr;
  }, [listId, limit]);
}

export function useProjectSession(id: string | null | undefined): ProjectSession | undefined {
  return useLiveQuery(async () => (id ? await db.projectSessions.get(id) : undefined), [id]);
}

// =============================================================================
// Helpers
// =============================================================================

/** Returns the next `order` value: max(order) + 1, or 0 for an empty table. */
async function nextOrder(getLast: () => Promise<{ order: number } | undefined>): Promise<number> {
  const last = await getLast();
  return last ? last.order + 1 : 0;
}

/**
 * Reorder a row in any table that has an `order` column. Strategy: rewrite all
 * rows' `order` to a dense [0..n-1] sequence after the move. Cheap for the
 * sizes this app deals with (tens to low hundreds of rows per table) and
 * avoids fractional-index drift.
 */
async function reorderById<T extends { id: string; order: number }>(
  table: { toArray(): Promise<T[]>; bulkPut(rows: T[]): Promise<unknown> },
  id: string,
  newIndex: number,
): Promise<void> {
  const rows = (await table.toArray()).sort((a, b) => a.order - b.order);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const [moved] = rows.splice(idx, 1);
  const clamped = Math.max(0, Math.min(newIndex, rows.length));
  rows.splice(clamped, 0, moved);
  rows.forEach((r, i) => {
    r.order = i;
  });
  await table.bulkPut(rows);
}

export const reorderShoppingItem = (id: string, newIndex: number) =>
  reorderById(db.shoppingItems, id, newIndex);
export const reorderShoppingGroup = (id: string, newIndex: number) =>
  reorderById(db.shoppingGroups, id, newIndex);
export const reorderShoppingList = (id: string, newIndex: number) =>
  reorderById(db.shoppingLists, id, newIndex);
export const reorderChoreItem = (id: string, newIndex: number) =>
  reorderById(db.choreItems, id, newIndex);
export const reorderChoreRoutine = (id: string, newIndex: number) =>
  reorderById(db.choreRoutines, id, newIndex);
export const reorderChoreList = (id: string, newIndex: number) =>
  reorderById(db.choreLists, id, newIndex);
export const reorderProjectStep = (id: string, newIndex: number) =>
  reorderById(db.projectSteps, id, newIndex);
export const reorderProjectProcess = (id: string, newIndex: number) =>
  reorderById(db.projectProcesses, id, newIndex);
export const reorderProjectList = (id: string, newIndex: number) =>
  reorderById(db.projectLists, id, newIndex);
