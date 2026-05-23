// All entity types live here. IDs are crypto.randomUUID() strings; dates are
// unix-ms numbers. The middle "container" tier varies by flavor:
//   Shopping  → Group       (members carry defaultQty)
//   Chores    → Routine     (members are just item refs)
//   Projects  → Process     (members are just step refs)
// Quantity exists only in the Shopping flavor — chores and projects are
// binary done / not-done.
//
// `order: number` is a sortable index used for user-controlled ordering of
// items/groups/lists in their library views. Within a saved list's `entries`
// or a container's `members`, ordering is implicit by array position.

export type Photo = {
  id: string;
  blob: Blob;
  mime: string;
  createdAt: number;
};

// ---------- Shopping ----------

export type ShoppingItem = {
  id: string;
  name: string;
  notes?: string;
  photoId?: string;
  /** User-defined tags. Case-preserved on write; compared case-insensitively. */
  tags?: string[];
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ShoppingGroupMember = {
  itemId: string;
  defaultQty: number;
};

export type ShoppingGroup = {
  id: string;
  name: string;
  notes?: string;
  photoId?: string;
  /** Ordered. */
  members: ShoppingGroupMember[];
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ShoppingListEntry =
  | { kind: 'item'; itemId: string; qty: number }
  | { kind: 'group'; groupId: string; qty: number; excludedItemIds?: string[] }
  | { kind: 'temp'; tempId: string; name: string; qty: number };

export type ShoppingList = {
  id: string;
  name: string;
  notes?: string;
  /** Ordered. */
  entries: ShoppingListEntry[];
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ShoppingResolvedItem = {
  itemId: string;
  qty: number;
  checked: boolean;
  /** Set only for inline temp items (no library record). `itemId` doubles as the tempId. */
  name?: string;
};

export type ShoppingSession = {
  id: string;
  listId: string;
  /** Snapshot of the list name at session start, in case the list is renamed/deleted later. */
  listName: string;
  startedAt: number;
  completedAt?: number;
  /** Ordered. */
  resolvedItems: ShoppingResolvedItem[];
  /** Item ID order at session creation — used to restore original order. Non-indexed; no schema version bump needed. */
  originalOrder?: string[];
  photoIds: string[];
  notes?: string;
};

// ---------- Chores ----------

export type ChoreItem = {
  id: string;
  name: string;
  notes?: string;
  photoId?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ChoreRoutineMember = {
  itemId: string;
};

export type ChoreRoutine = {
  id: string;
  name: string;
  notes?: string;
  photoId?: string;
  /** Ordered. */
  members: ChoreRoutineMember[];
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ChoreListEntry =
  | { kind: 'item'; itemId: string }
  | { kind: 'routine'; routineId: string; excludedItemIds?: string[] }
  | { kind: 'temp'; tempId: string; name: string };

export type ChoreList = {
  id: string;
  name: string;
  notes?: string;
  /** Ordered. */
  entries: ChoreListEntry[];
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ChoreResolvedItem = {
  itemId: string;
  checked: boolean;
  /** Set only for inline temp items (no library record). `itemId` doubles as the tempId. */
  name?: string;
};

export type ChoreSession = {
  id: string;
  listId: string;
  listName: string;
  startedAt: number;
  completedAt?: number;
  /** Ordered. */
  resolvedItems: ChoreResolvedItem[];
  photoIds: string[];
  notes?: string;
};

// ---------- Projects ----------

export type ProjectStep = {
  id: string;
  name: string;
  notes?: string;
  photoId?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ProjectProcessMember = {
  stepId: string;
};

export type ProjectProcess = {
  id: string;
  name: string;
  notes?: string;
  photoId?: string;
  /** Ordered. */
  members: ProjectProcessMember[];
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ProjectListEntry =
  | { kind: 'step'; stepId: string }
  | { kind: 'process'; processId: string; excludedStepIds?: string[] }
  | { kind: 'temp'; tempId: string; name: string };

export type ProjectList = {
  id: string;
  name: string;
  notes?: string;
  /** Ordered. */
  entries: ProjectListEntry[];
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ProjectResolvedStep = {
  stepId: string;
  checked: boolean;
  /** Set only for inline temp items (no library record). `stepId` doubles as the tempId. */
  name?: string;
};

export type ProjectSession = {
  id: string;
  listId: string;
  listName: string;
  startedAt: number;
  completedAt?: number;
  /** Ordered. */
  resolvedSteps: ProjectResolvedStep[];
  photoIds: string[];
  notes?: string;
};

// ---------- Cross-cutting ----------

export type Flavor = 'shopping' | 'chores' | 'projects';
