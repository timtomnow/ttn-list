import Dexie, { type Table } from 'dexie';
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

/** Bumped whenever the on-disk shape changes. Written into JSON exports. */
export const SCHEMA_VERSION = 1;

export class TtnListDB extends Dexie {
  photos!: Table<Photo, string>;

  shoppingItems!: Table<ShoppingItem, string>;
  shoppingGroups!: Table<ShoppingGroup, string>;
  shoppingLists!: Table<ShoppingList, string>;
  shoppingSessions!: Table<ShoppingSession, string>;

  choreItems!: Table<ChoreItem, string>;
  choreRoutines!: Table<ChoreRoutine, string>;
  choreLists!: Table<ChoreList, string>;
  choreSessions!: Table<ChoreSession, string>;

  projectSteps!: Table<ProjectStep, string>;
  projectProcesses!: Table<ProjectProcess, string>;
  projectLists!: Table<ProjectList, string>;
  projectSessions!: Table<ProjectSession, string>;

  constructor() {
    super('ttn-list');
    // Index only what we'll query: primary key + name (for sort/search) +
    // order (for user-controlled ordering) + createdAt (recency) + parent
    // refs (listId on sessions). Members and entries arrays are non-indexed
    // — we read the parent and walk in-memory.
    this.version(1).stores({
      photos: 'id, createdAt',

      shoppingItems: 'id, name, order, createdAt',
      shoppingGroups: 'id, name, order, createdAt',
      shoppingLists: 'id, name, order, createdAt',
      shoppingSessions: 'id, listId, startedAt, completedAt',

      choreItems: 'id, name, order, createdAt',
      choreRoutines: 'id, name, order, createdAt',
      choreLists: 'id, name, order, createdAt',
      choreSessions: 'id, listId, startedAt, completedAt',

      projectSteps: 'id, name, order, createdAt',
      projectProcesses: 'id, name, order, createdAt',
      projectLists: 'id, name, order, createdAt',
      projectSessions: 'id, listId, startedAt, completedAt',
    });
  }
}

export const db = new TtnListDB();
