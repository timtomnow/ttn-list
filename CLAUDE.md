# CLAUDE.md

Notes for future Claude (or human) sessions working on this project.

## What this is
**TTN List** — a local-first PWA with three sibling list flavors (Shopping,
Chores, Projects) that share infrastructure. Each flavor has a three-tier
data model: **items** (the leaves), **groups/routines/processes** (named
collections of items), and **lists** (saved, ordered selections of items
and/or groups, runnable as a checklist with the "Run it" mode). See
[plan.md](plan.md) for the full product spec, phased build plan, and the
exact prompts to continue any unfinished phase.

## Quick start
```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build (also generates the service worker)
npm run preview      # serve the production build locally to test PWA install
npm run typecheck
```

## Stack
- **Vite + React 18 + TypeScript** (strict)
- **Tailwind CSS** for styling — mobile-first, no extra CSS layer
- **react-router-dom v6** for navigation
- **Dexie** (IndexedDB) for local persistence — no backend
- **dexie-react-hooks** `useLiveQuery` powers reactive UI; we don't need Redux
- **vite-plugin-pwa** — installable, offline-capable
- **Screen Wake Lock API** — best-effort, used during "Run it" mode (no fallback)

## Code map
```
src/
  app/             router, providers, layout entry
  components/
    inputs/        TagInput (other inputs added per feature phase)
    layout/        AppShell, BottomNav, Sidebar, Logo
    ui/            EmptyState, Modal, PageHeader, Toast
  pages/           Shopping, Chores, Projects, Reminders, Settings
                   (each top-level page; sub-routes are added in feature phases)
  db/
    schema.ts      Dexie database (versioned, all 13 tables)
    repo.ts        typed CRUD + useLiveQuery hooks — components import from here
    exportImport.ts JSON export/import with base64-encoded photos
  lib/             id, color, date, ics, tags, ttnBackup
  types.ts         All entity types — one source of truth
```

The `lib/ttnBackup.ts` module installs `window.TTNBackupAdapter` so the
cross-app **ttn-backup** utility (a separate PWA at
`timtomnow.github.io/ttn-backup/`) can snapshot and restore this app's
data via a hidden same-origin iframe + postMessage. `App.tsx` calls
`installTtnBackupAdapter()` once on mount; `Settings.tsx` has a "Restore
from ttn-backup" button that calls `openTtnBackupRestore()`. The
adapter's `importData` reuses `parseExportPayload` + `importData(payload,
'replace')` from `db/exportImport.ts` and then reloads the page — same
contract as the in-app Replace import flow. The client.js script that
implements the protocol is loaded from `/ttn-backup/client.js` (sibling
project on GitHub Pages) via a script tag in `index.html`.

## Data model summary
Three flavors × three tiers + sessions + a shared `photos` table:

| Flavor    | Item-tier        | Container-tier      | List-tier        | Session            |
| --------- | ---------------- | ------------------- | ---------------- | ------------------ |
| Shopping  | `ShoppingItem`   | `ShoppingGroup`     | `ShoppingList`   | `ShoppingSession`  |
| Chores    | `ChoreItem`      | `ChoreRoutine`      | `ChoreList`      | `ChoreSession`     |
| Projects  | `ProjectStep`    | `ProjectProcess`    | `ProjectList`    | `ProjectSession`   |

Plus `Photo` (Blob in IndexedDB, encoded as base64 only on JSON export/import).

- **Quantity** lives only on Shopping (`ShoppingListEntry.qty`,
  `ShoppingGroupMember.defaultQty`). Chores and Projects are binary done /
  not-done.
- **List entries** are a discriminated union: an entry is either a direct
  item/step ref, OR a group/routine/process ref (with optional
  `excludedItemIds` to skip specific members on this run only — the "I
  already have lettuce" case).
- **Ordering** is user-controlled in four places: items in their library,
  members within a group/routine/process, entries within a saved list, and
  the list of lists itself. Library/list order is stored as `order: number`
  on the row; member/entry order is implicit by array position.

## Conventions
- **Never call Dexie directly from a component.** Go through `src/db/repo.ts`.
- **Reactive reads** use `useLiveQuery` (see `repo.ts` for the wrappers).
- **IDs** are `crypto.randomUUID()` — generated in the repo, not the caller.
- **Dates** are unix-ms numbers in the DB; format only at the view layer.
- **Photos** are stored as `Blob` in IndexedDB; render thumbnails via
  `URL.createObjectURL` and revoke the URL on unmount. Base64 is only used
  on JSON export/import.
- **Tailwind** classes only; if you reach for `style={{}}` ask whether a class
  would do the job. Dynamic positioning (e.g. photo thumbnail crop offsets,
  the wake-lock indicator's pulsing dot) is the exception.
- **No new top-level deps** without updating `plan.md`'s "Stack & Key
  Decisions" table and explaining the tradeoff.
- **Bump the Dexie version** in `schema.ts` and add a migration whenever you
  change a stored shape. Non-indexed fields can be added freely; new indexes
  or table renames require a version bump.

## PWA notes
- `vite-plugin-pwa` is configured with `registerType: 'autoUpdate'`.
- Manifest lives in `vite.config.ts` (not a separate `manifest.json`) so we
  can share metadata with the build.
- Icons in `public/`: `favicon.svg`, `icon.svg`, `icon-maskable.svg` —
  placeholders. Branded icons land in Phase 11.
- Deep links: reminder `.ics` files target `/<flavor>/lists/:id`. If the ID
  doesn't resolve, the route handler should redirect to `/` with a friendly
  toast (Phase 9 wires this up).

## Working on this codebase
- Look at `plan.md` first — it tells you which phases are done and the prompt
  for each remaining phase. Each phase is intentionally independent.
- Prefer editing existing files over adding new ones. The folder structure is
  intentionally flat.
- When you change the data model, **bump the Dexie version** in `schema.ts`
  and add a migration. Do not silently change a schema.
