# TTN List

Local-first PWA for **shopping**, **chores**, and **projects** — three sibling
list flavors that share the same shape: a library of reusable items, optional
named groups, saved lists you can run as a checklist, and a history of
completed runs with photos and notes.

No backend. No account. No telemetry. Everything lives in IndexedDB inside
your browser.

## Features

- **Three flavors**, each with the same three-tier model — items, groups (or
  routines/processes), and saved lists.
- **Quantity** on Shopping (with summed-on-resolve and per-group exclusions);
  binary done/not-done on Chores and Projects.
- **Run modes** with screen wake-lock, in-run reordering, and resume support
  — back out mid-shop, return later, pick up where you left off.
- **Photos** on items, group-tier containers, and sessions. Stored as native
  Blobs in IndexedDB; base64-encoded only for export.
- **Reminders** generate `.ics` calendar files that deep-link to a specific
  list. Recurrence supports daily, weekly with by-day, and monthly.
- **Import/Export** a single JSON file with everything (including photos)
  for backup or device migration. Merge or replace on import.
- **ttn-backup integration**: a separate utility PWA at
  `timtomnow.github.io/ttn-backup/` snapshots TTN List (and other
  compatible apps) on a calendar schedule into one bundled `.json`.
  Settings → Restore from ttn-backup pulls any saved bundle back in.
- **Mobile-first** UI designed for a 375px viewport. Light, dark, and
  system theme.
- **Installable** as a PWA on iOS and Android. Offline-capable via Workbox.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build (also generates the service worker)
npm run preview      # serve the production build locally to test PWA install
npm run check        # lint + typecheck + tests + build
```

## Stack

| Concern        | Choice                              |
| -------------- | ----------------------------------- |
| Bundler / dev  | Vite                                |
| Framework      | React 18 + TypeScript (strict)      |
| Styling        | Tailwind CSS                        |
| Routing        | react-router-dom v6                 |
| Persistence    | Dexie (IndexedDB)                   |
| Reactive reads | dexie-react-hooks (`useLiveQuery`)  |
| PWA            | vite-plugin-pwa (Workbox)           |
| Icons          | lucide-react                        |
| Wake lock      | Screen Wake Lock API (best-effort)  |
| Testing        | Vitest                              |

## Project layout

```
src/
  app/                  # router, theme provider
  components/
    inputs/             # PhotoPicker, TagInput
    layout/             # AppShell, BottomNav, Sidebar, Logo
    ui/                 # EmptyState, Modal, PageHeader, Thumbnail, Toast
  hooks/                # useWakeLock, useDeadLinkBail
  pages/
    shopping/           # full Shopping vertical (items, groups, lists, run, history)
    chores/              # mirror minus qty
    projects/           # mirror with Step / Process / List naming
    Reminders.tsx       # cross-flavor .ics generator
    Settings.tsx        # theme, backup/restore, help link
    Help.tsx            # in-app help document
  db/
    schema.ts           # Dexie database (versioned, all 13 tables)
    repo.ts             # typed CRUD + useLiveQuery hooks
    exportImport.ts     # JSON export/import with base64 photos
  lib/                  # date, ics, id, color, tags, shopping/chores/projects resolvers
  types.ts              # all entity types
```

## Conventions

- Components **never call Dexie directly** — go through [src/db/repo.ts](src/db/repo.ts).
- IDs are `crypto.randomUUID()`, generated in the repo.
- Dates are unix-ms; format only at the view layer.
- Tailwind classes only; inline `style` is reserved for dynamic positioning.
- New top-level deps require updating `plan.md`'s Stack & Key Decisions table.
- Schema changes require bumping `SCHEMA_VERSION` in
  [src/db/schema.ts](src/db/schema.ts) and adding a Dexie migration.

## Data model

Three flavors × three tiers + sessions + a shared `photos` table:

| Flavor    | Item-tier        | Container-tier      | List-tier        | Session            |
| --------- | ---------------- | ------------------- | ---------------- | ------------------ |
| Shopping  | `ShoppingItem`   | `ShoppingGroup`     | `ShoppingList`   | `ShoppingSession`  |
| Chores    | `ChoreItem`      | `ChoreRoutine`      | `ChoreList`      | `ChoreSession`     |
| Projects  | `ProjectStep`    | `ProjectProcess`    | `ProjectList`    | `ProjectSession`   |

Plus `Photo` (Blob in IndexedDB). See [src/types.ts](src/types.ts) for the
full surface and [src/db/schema.ts](src/db/schema.ts) for indexing.

## Build plan

Phased build plan, status, and next-up prompts live in [plan.md](plan.md).
Phases 0–11 complete; future-of-the-roadmap ideas (cloud sync, sharing,
voice-add) at the bottom.

## Help

The in-app Help page (Settings → Help, or `/settings/help`) is the
end-user-facing tour of the features. The CLAUDE.md and plan.md files in
this repo are the developer-facing equivalents.

## Deployment

Configured for GitHub Pages at `/ttn-list/`. The `deploy.yml` workflow builds
on push to `main` and publishes via `actions/deploy-pages`. Adjust
[vite.config.ts](vite.config.ts)'s `BASE` if hosting elsewhere.

## License

MIT — see [LICENSE](LICENSE).
