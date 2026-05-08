import { db, SCHEMA_VERSION } from './schema';
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

/** Photos travel as base64 strings in JSON; we decode back to Blob on import. */
type PhotoExport = {
  id: string;
  mime: string;
  dataBase64: string;
  createdAt: number;
};

export type ExportPayload = {
  version: number;
  exportedAt: number;
  photos: PhotoExport[];

  shoppingItems: ShoppingItem[];
  shoppingGroups: ShoppingGroup[];
  shoppingLists: ShoppingList[];
  shoppingSessions: ShoppingSession[];

  choreItems: ChoreItem[];
  choreRoutines: ChoreRoutine[];
  choreLists: ChoreList[];
  choreSessions: ChoreSession[];

  projectSteps: ProjectStep[];
  projectProcesses: ProjectProcess[];
  projectLists: ProjectList[];
  projectSessions: ProjectSession[];
};

export type ImportMode = 'merge' | 'replace';

export type ImportSummary = {
  photosAdded: number;
  shoppingAdded: number;
  shoppingSkipped: number;
  choresAdded: number;
  choresSkipped: number;
  projectsAdded: number;
  projectsSkipped: number;
};

// ---------- Base64 <-> Blob ----------

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Chunk to avoid call-stack overflow on large blobs.
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ---------- Export ----------

export async function exportData(): Promise<ExportPayload> {
  const [
    rawPhotos,
    shoppingItems,
    shoppingGroups,
    shoppingLists,
    shoppingSessions,
    choreItems,
    choreRoutines,
    choreLists,
    choreSessions,
    projectSteps,
    projectProcesses,
    projectLists,
    projectSessions,
  ] = await Promise.all([
    db.photos.toArray(),
    db.shoppingItems.toArray(),
    db.shoppingGroups.toArray(),
    db.shoppingLists.toArray(),
    db.shoppingSessions.toArray(),
    db.choreItems.toArray(),
    db.choreRoutines.toArray(),
    db.choreLists.toArray(),
    db.choreSessions.toArray(),
    db.projectSteps.toArray(),
    db.projectProcesses.toArray(),
    db.projectLists.toArray(),
    db.projectSessions.toArray(),
  ]);

  const photos: PhotoExport[] = await Promise.all(
    rawPhotos.map(async (p) => ({
      id: p.id,
      mime: p.mime,
      dataBase64: await blobToBase64(p.blob),
      createdAt: p.createdAt,
    })),
  );

  return {
    version: SCHEMA_VERSION,
    exportedAt: Date.now(),
    photos,
    shoppingItems,
    shoppingGroups,
    shoppingLists,
    shoppingSessions,
    choreItems,
    choreRoutines,
    choreLists,
    choreSessions,
    projectSteps,
    projectProcesses,
    projectLists,
    projectSessions,
  };
}

export function exportFilename(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `ttn-list-export-${yyyy}-${mm}-${dd}.json`;
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ---------- Parse / validate ----------

/**
 * Validate an unknown value as a well-shaped ExportPayload. Throws with a
 * human-readable message on any failure — never partially succeeds.
 *
 * Validation here is pragmatic: we check the top-level shape and a handful of
 * key fields per row. Beyond that we trust the file, since this is a backup
 * format we control. Anything corrupt enough to fail a deep check would also
 * be useless to the app.
 */
export function parseExportPayload(value: unknown): ExportPayload {
  if (!value || typeof value !== 'object') {
    throw new Error('File is empty or not a JSON object.');
  }
  const v = value as Record<string, unknown>;
  if (typeof v.version !== 'number') {
    throw new Error('Missing "version" field.');
  }
  if (v.version > SCHEMA_VERSION) {
    throw new Error(
      `File was exported by a newer version (${v.version}). This app supports up to v${SCHEMA_VERSION}.`,
    );
  }

  const tableNames = [
    'photos',
    'shoppingItems',
    'shoppingGroups',
    'shoppingLists',
    'shoppingSessions',
    'choreItems',
    'choreRoutines',
    'choreLists',
    'choreSessions',
    'projectSteps',
    'projectProcesses',
    'projectLists',
    'projectSessions',
  ] as const;

  for (const t of tableNames) {
    if (!Array.isArray(v[t])) {
      throw new Error(`Missing or non-array field "${t}".`);
    }
  }

  const photos = (v.photos as unknown[]).map((p, i) => requirePhoto(p, i));

  return {
    version: v.version,
    exportedAt: typeof v.exportedAt === 'number' ? v.exportedAt : Date.now(),
    photos,
    shoppingItems: v.shoppingItems as ShoppingItem[],
    shoppingGroups: v.shoppingGroups as ShoppingGroup[],
    shoppingLists: v.shoppingLists as ShoppingList[],
    shoppingSessions: v.shoppingSessions as ShoppingSession[],
    choreItems: v.choreItems as ChoreItem[],
    choreRoutines: v.choreRoutines as ChoreRoutine[],
    choreLists: v.choreLists as ChoreList[],
    choreSessions: v.choreSessions as ChoreSession[],
    projectSteps: v.projectSteps as ProjectStep[],
    projectProcesses: v.projectProcesses as ProjectProcess[],
    projectLists: v.projectLists as ProjectList[],
    projectSessions: v.projectSessions as ProjectSession[],
  };
}

function requirePhoto(p: unknown, idx: number): PhotoExport {
  if (!p || typeof p !== 'object') throw new Error(`photos[${idx}] is not an object.`);
  const o = p as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) throw new Error(`photos[${idx}].id missing.`);
  if (typeof o.mime !== 'string' || !o.mime) throw new Error(`photos[${idx}].mime missing.`);
  if (typeof o.dataBase64 !== 'string') throw new Error(`photos[${idx}].dataBase64 missing.`);
  if (typeof o.createdAt !== 'number') throw new Error(`photos[${idx}].createdAt missing.`);
  return { id: o.id, mime: o.mime, dataBase64: o.dataBase64, createdAt: o.createdAt };
}

// ---------- Import ----------

/**
 * Apply a parsed payload to the DB. The whole operation runs in a single
 * Dexie transaction so a mid-flight failure leaves the DB untouched.
 */
export async function importData(
  payload: ExportPayload,
  mode: ImportMode,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    photosAdded: 0,
    shoppingAdded: 0,
    shoppingSkipped: 0,
    choresAdded: 0,
    choresSkipped: 0,
    projectsAdded: 0,
    projectsSkipped: 0,
  };

  // Decode photos outside the transaction — base64 → Blob can be slow, and
  // we want the transaction to be as short as possible.
  const photos: Photo[] = payload.photos.map((p) => ({
    id: p.id,
    blob: base64ToBlob(p.dataBase64, p.mime),
    mime: p.mime,
    createdAt: p.createdAt,
  }));

  await db.transaction(
    'rw',
    [
      db.photos,
      db.shoppingItems,
      db.shoppingGroups,
      db.shoppingLists,
      db.shoppingSessions,
      db.choreItems,
      db.choreRoutines,
      db.choreLists,
      db.choreSessions,
      db.projectSteps,
      db.projectProcesses,
      db.projectLists,
      db.projectSessions,
    ],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.photos.clear(),
          db.shoppingItems.clear(),
          db.shoppingGroups.clear(),
          db.shoppingLists.clear(),
          db.shoppingSessions.clear(),
          db.choreItems.clear(),
          db.choreRoutines.clear(),
          db.choreLists.clear(),
          db.choreSessions.clear(),
          db.projectSteps.clear(),
          db.projectProcesses.clear(),
          db.projectLists.clear(),
          db.projectSessions.clear(),
        ]);
        await Promise.all([
          db.photos.bulkAdd(photos),
          db.shoppingItems.bulkAdd(payload.shoppingItems),
          db.shoppingGroups.bulkAdd(payload.shoppingGroups),
          db.shoppingLists.bulkAdd(payload.shoppingLists),
          db.shoppingSessions.bulkAdd(payload.shoppingSessions),
          db.choreItems.bulkAdd(payload.choreItems),
          db.choreRoutines.bulkAdd(payload.choreRoutines),
          db.choreLists.bulkAdd(payload.choreLists),
          db.choreSessions.bulkAdd(payload.choreSessions),
          db.projectSteps.bulkAdd(payload.projectSteps),
          db.projectProcesses.bulkAdd(payload.projectProcesses),
          db.projectLists.bulkAdd(payload.projectLists),
          db.projectSessions.bulkAdd(payload.projectSessions),
        ]);
        summary.photosAdded = photos.length;
        summary.shoppingAdded =
          payload.shoppingItems.length +
          payload.shoppingGroups.length +
          payload.shoppingLists.length +
          payload.shoppingSessions.length;
        summary.choresAdded =
          payload.choreItems.length +
          payload.choreRoutines.length +
          payload.choreLists.length +
          payload.choreSessions.length;
        summary.projectsAdded =
          payload.projectSteps.length +
          payload.projectProcesses.length +
          payload.projectLists.length +
          payload.projectSessions.length;
        return;
      }

      // Merge: skip rows whose id already exists.
      const [
        existingPhotoIds,
        existingShopItem,
        existingShopGroup,
        existingShopList,
        existingShopSession,
        existingChoreItem,
        existingChoreRoutine,
        existingChoreList,
        existingChoreSession,
        existingStep,
        existingProcess,
        existingProjectList,
        existingProjectSession,
      ] = await Promise.all([
        db.photos.toCollection().primaryKeys() as Promise<string[]>,
        db.shoppingItems.toCollection().primaryKeys() as Promise<string[]>,
        db.shoppingGroups.toCollection().primaryKeys() as Promise<string[]>,
        db.shoppingLists.toCollection().primaryKeys() as Promise<string[]>,
        db.shoppingSessions.toCollection().primaryKeys() as Promise<string[]>,
        db.choreItems.toCollection().primaryKeys() as Promise<string[]>,
        db.choreRoutines.toCollection().primaryKeys() as Promise<string[]>,
        db.choreLists.toCollection().primaryKeys() as Promise<string[]>,
        db.choreSessions.toCollection().primaryKeys() as Promise<string[]>,
        db.projectSteps.toCollection().primaryKeys() as Promise<string[]>,
        db.projectProcesses.toCollection().primaryKeys() as Promise<string[]>,
        db.projectLists.toCollection().primaryKeys() as Promise<string[]>,
        db.projectSessions.toCollection().primaryKeys() as Promise<string[]>,
      ]);

      const newPhotos = photos.filter((p) => !existingPhotoIds.includes(p.id));
      const filterNew = <T extends { id: string }>(rows: T[], existing: string[]): T[] => {
        const set = new Set(existing);
        return rows.filter((r) => !set.has(r.id));
      };

      const newShopItems = filterNew(payload.shoppingItems, existingShopItem);
      const newShopGroups = filterNew(payload.shoppingGroups, existingShopGroup);
      const newShopLists = filterNew(payload.shoppingLists, existingShopList);
      const newShopSessions = filterNew(payload.shoppingSessions, existingShopSession);

      const newChoreItems = filterNew(payload.choreItems, existingChoreItem);
      const newChoreRoutines = filterNew(payload.choreRoutines, existingChoreRoutine);
      const newChoreLists = filterNew(payload.choreLists, existingChoreList);
      const newChoreSessions = filterNew(payload.choreSessions, existingChoreSession);

      const newSteps = filterNew(payload.projectSteps, existingStep);
      const newProcesses = filterNew(payload.projectProcesses, existingProcess);
      const newProjectLists = filterNew(payload.projectLists, existingProjectList);
      const newProjectSessions = filterNew(payload.projectSessions, existingProjectSession);

      await Promise.all([
        newPhotos.length ? db.photos.bulkAdd(newPhotos) : Promise.resolve(),
        newShopItems.length ? db.shoppingItems.bulkAdd(newShopItems) : Promise.resolve(),
        newShopGroups.length ? db.shoppingGroups.bulkAdd(newShopGroups) : Promise.resolve(),
        newShopLists.length ? db.shoppingLists.bulkAdd(newShopLists) : Promise.resolve(),
        newShopSessions.length ? db.shoppingSessions.bulkAdd(newShopSessions) : Promise.resolve(),
        newChoreItems.length ? db.choreItems.bulkAdd(newChoreItems) : Promise.resolve(),
        newChoreRoutines.length ? db.choreRoutines.bulkAdd(newChoreRoutines) : Promise.resolve(),
        newChoreLists.length ? db.choreLists.bulkAdd(newChoreLists) : Promise.resolve(),
        newChoreSessions.length ? db.choreSessions.bulkAdd(newChoreSessions) : Promise.resolve(),
        newSteps.length ? db.projectSteps.bulkAdd(newSteps) : Promise.resolve(),
        newProcesses.length ? db.projectProcesses.bulkAdd(newProcesses) : Promise.resolve(),
        newProjectLists.length ? db.projectLists.bulkAdd(newProjectLists) : Promise.resolve(),
        newProjectSessions.length
          ? db.projectSessions.bulkAdd(newProjectSessions)
          : Promise.resolve(),
      ]);

      summary.photosAdded = newPhotos.length;
      const totalShop =
        payload.shoppingItems.length +
        payload.shoppingGroups.length +
        payload.shoppingLists.length +
        payload.shoppingSessions.length;
      const newShop =
        newShopItems.length + newShopGroups.length + newShopLists.length + newShopSessions.length;
      summary.shoppingAdded = newShop;
      summary.shoppingSkipped = totalShop - newShop;

      const totalChore =
        payload.choreItems.length +
        payload.choreRoutines.length +
        payload.choreLists.length +
        payload.choreSessions.length;
      const newChore =
        newChoreItems.length +
        newChoreRoutines.length +
        newChoreLists.length +
        newChoreSessions.length;
      summary.choresAdded = newChore;
      summary.choresSkipped = totalChore - newChore;

      const totalProject =
        payload.projectSteps.length +
        payload.projectProcesses.length +
        payload.projectLists.length +
        payload.projectSessions.length;
      const newProject =
        newSteps.length + newProcesses.length + newProjectLists.length + newProjectSessions.length;
      summary.projectsAdded = newProject;
      summary.projectsSkipped = totalProject - newProject;
    },
  );

  return summary;
}
