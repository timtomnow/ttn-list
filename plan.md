# TTN List — Build Plan

A local-first PWA with three sibling list flavors that share infrastructure:

1. **Shopping** — items, groups (recipes/meals), saved lists, "Shop it" run mode, history.
2. **Chores** — chore items, routines (groups), saved lists, "Chore it" run mode, history.
3. **Projects** — project steps, processes (collections of steps), saved lists,
   "Run it" mode, history.

All three share a `photos` table (one optional photo per item / group-tier
container; one or more photos per session). All three support reminders that
generate `.ics` files deep-linking to a specific list, and a single JSON
import/export covers everything (photos included, base64-encoded in transit).

This file is both the product roadmap **and** a list of self-contained prompts
a future Claude session (or any engineer) can paste in to continue the work.
Each phase is sized so it can be implemented and verified independently.

---

## Stack & Key Decisions

| Concern        | Choice                              | Why                                                                 |
| -------------- | ----------------------------------- | ------------------------------------------------------------------- |
| Bundler / dev  | **Vite**                            | Fastest DX, first-class PWA plugin, TS out of the box.              |
| Framework      | **React 18 + TypeScript** (strict)  | Ubiquitous, excellent typing for our discriminated-union data model. |
| Styling        | **Tailwind CSS**                    | Mobile-first responsive, no custom CSS pipeline, calm minimal look. |
| Routing        | **react-router-dom v6**             | Standard, supports nested layouts.                                  |
| Persistence    | **Dexie (IndexedDB)**               | Local-first, works offline, photos stored as Blobs not base64.      |
| PWA            | **vite-plugin-pwa** (Workbox)       | Generates manifest + service worker; installable on iOS/Android.    |
| Icons          | **lucide-react**                    | Lightweight, consistent line icons.                                 |
| State          | React Context + `useLiveQuery`      | No Redux — Dexie's reactive hook is enough.                         |
| Wake lock      | **Screen Wake Lock API**, best-effort | Works in installed PWAs on Android & iOS 16.4+. No silent-video fallback — if it fails, the screen sleeps as normal. |

### Three-tier model — one shape per flavor
The hardest design decision. The Shopping flavor naturally has three tiers
(items, recipe-style groups, saved shopping lists). Chores fit cleanly into
the same shape (items, routines, lists). For Projects we considered a
two-tier model (just step + plan) but locked in the full three-tier shape
because users want both standalone "build a deck" steps **and** reusable
"morning prep" processes — and a project list often mixes both.

The shared shape is:

```
Item-tier (leaf)   →  Container-tier (named ordered group of items)   →  List-tier (saved entries: items and/or containers)
```

A list entry is a discriminated union: either a direct item ref, or a
container ref with optional `excludedItemIds` for one-off omissions. Lists
can be ordered by the user and re-run; each run is a `Session` with a
checked-off resolved-items array, optional photos, and a completion time.

### Quantity is Shopping-only
Chores and Projects don't have a sensible "qty" semantics ("do this chore
three times" feels off; "repeat step 2x" is rare and noisy). We avoid the
field on those flavors entirely rather than letting it sit unused.

### Wake lock posture: best-effort
The Screen Wake Lock API is now broadly supported in installed PWAs.
We acquire on entering a "Run it" session, release on completion or pause,
and re-acquire on visibility change. If acquisition fails (older browser,
desktop without permission, etc.), the run still works — the screen just
sleeps normally. **No silent-video fallback** — the complexity isn't worth it
for a v1.

---

## Data Model

See [src/types.ts](src/types.ts) for the full TypeScript surface. Summary:

| Tier             | Shopping            | Chores             | Projects            |
| ---------------- | ------------------- | ------------------ | ------------------- |
| Item             | `ShoppingItem`      | `ChoreItem`        | `ProjectStep`       |
| Container        | `ShoppingGroup`     | `ChoreRoutine`     | `ProjectProcess`    |
| List             | `ShoppingList`      | `ChoreList`        | `ProjectList`       |
| Session          | `ShoppingSession`   | `ChoreSession`     | `ProjectSession`    |

Cross-cutting:
- `Photo` — `{ id, blob, mime, createdAt }`. Items and containers may have
  one optional photo; sessions may have many.
- `order: number` — present on item, container, and list rows for
  user-controlled ordering of those library views.
- Container-tier `members` and list-tier `entries` arrays are themselves
  ordered by array position.

`SCHEMA_VERSION = 1`. Bump it (and add a migration) on every shape change.

---

## Folder Layout

```
src/
  app/                # router, providers, theme
  components/
    inputs/           # TagInput; per-feature inputs added in their phase
    layout/           # AppShell, BottomNav, Sidebar, Logo
    ui/               # EmptyState, Modal, PageHeader, Toast
  pages/
    Shopping.tsx      # tab root; sub-routes (items, groups, lists, run, history) added in their phases
    Chores.tsx
    Projects.tsx
    Reminders.tsx
    Settings.tsx
  db/
    schema.ts         # Dexie database — all 13 tables at v1
    repo.ts           # typed CRUD + useLiveQuery hooks (one section per entity)
    exportImport.ts   # JSON I/O with base64 photo encode/decode, merge/replace
  lib/                # id, color, date, ics, tags
  types.ts            # All entity types — one source of truth
public/
  favicon.svg, icon.svg, icon-maskable.svg   # placeholders; branded icons in Phase 11
```

---

## Phases (each phase = one Claude prompt)

> ✅ done in this initial pass · ⏳ remaining

### Phase 0 — Scaffold ✅
**Done in the bootstrap session.** All infrastructure copied from
`plot-my-notes` and rethemed; data model and storage layer written from
scratch; empty page stubs in place; PWA manifest configured at
`/ttn-list/`. Stack confirmed (no Recharts; Wake Lock added; everything
else as plot-my-notes).

### Phase 1 — Theme + nav shell live ✅
*Verified by the bootstrap session: `npm run check` clean and the user
confirmed `npm install` + `npm run check` ran. PWA installability untested
on a real device — flag for a polish pass.*

**Goal:** Verify the scaffold actually runs end-to-end before building features.
**Deliverables:**
- `npm run dev` boots, every nav tab navigates, the theme switcher in
  Settings persists across reloads, and `npm run build && npm run preview`
  is installable as a PWA on a phone.
- Smoke test: open a flavor page, confirm it renders the empty-state card.
- Run `npm run check` clean (lint + typecheck + tests + build).

**Prompt for next session:**
> *"TTN List Phase 1. The scaffold is done. Run `npm install` then
> `npm run check` and fix any issues. Then `npm run dev` and walk through
> every nav tab on a 375px-wide viewport: Shopping, Chores, Projects,
> Reminders, Settings. Confirm the theme switcher in Settings persists
> across reloads. Don't add features — only fix anything that's broken in
> the scaffold itself. Don't touch [src/types.ts](src/types.ts),
> [src/db/](src/db/), [plan.md](plan.md). Acceptance: `npm run check`
> passes and the app installs as a PWA in iOS Safari / Chrome Android."*

### Phase 2 — Photos infrastructure ✅
**Goal:** A reusable `<PhotoPicker>` component and the
`URL.createObjectURL` plumbing every other phase will lean on.
**Deliverables:**
- `<PhotoPicker value photo? onChange>` — capture-or-pick UI (uses
  `<input type="file" accept="image/*" capture="environment">`), shows a
  thumbnail when set, has a "remove" affordance.
- A `usePhotoUrl(photoId)` hook that returns a stable object URL and
  revokes it on unmount.
- A `<Thumbnail photoId size?>` for list rows.
- Photos persist via `addPhoto / deletePhoto` from `repo.ts` (already wired).

**Prompt for next session:**
> *"TTN List Phase 2 — photos infrastructure. The `Photo` type, `photos`
> Dexie table, and `addPhoto/deletePhoto/usePhoto` helpers in
> [src/db/repo.ts](src/db/repo.ts) already exist. Build:
> (1) [src/components/inputs/PhotoPicker.tsx](src/components/inputs/PhotoPicker.tsx)
> with capture/pick UI and a remove button;
> (2) [src/components/ui/Thumbnail.tsx](src/components/ui/Thumbnail.tsx)
> rendering a Blob URL with proper revocation on unmount;
> (3) a `usePhotoUrl` hook colocated with `Thumbnail`.
> Mobile-first; reuse Tailwind utilities. Don't touch the data layer.
> Acceptance: a tiny demo route or a Storybook-style scratch page where you
> can add/remove a photo and see the thumbnail update reactively."*

### Phase 3 — Shopping items + groups CRUD ✅
**Goal:** Library views for shopping items and groups, with photo,
notes, drag-reorder, and group-membership editing.
**Deliverables:**
- `/shopping/items` — list, add, edit, delete, reorder ShoppingItem.
- `/shopping/groups` — list, add, edit, delete, reorder ShoppingGroup;
  group-edit screen lets the user pick member items and set `defaultQty`,
  with member ordering via up/down arrows.
- Search/filter on each library page (substring match on name).
- `reorderById` from `repo.ts` powers the reorder UX.

**Prompt for next session:**
> *"TTN List Phase 3 — Shopping items + groups CRUD. Build
> `/shopping/items` (list + add + edit + delete + reorder) and
> `/shopping/groups` (same plus member-picker UI). Use the existing
> `useShoppingItems`, `createShoppingItem`, etc. helpers in
> [src/db/repo.ts](src/db/repo.ts) — never call Dexie directly. Use
> `<PhotoPicker>` from Phase 2. Don't touch chore/project pages or the
> data model. Mobile-first; design for 375px first. Acceptance:
> create-edit-delete-reorder flow on items and groups, with photos, on a
> phone-sized viewport."*

### Phase 4 — Shopping saved lists + qty math + exclusions ✅
**Goal:** Compose a saved shopping list from items and groups, with
quantities and per-run exclusions ("I already have lettuce").
**Deliverables:**
- `/shopping/lists` — list of saved lists; add/edit/delete/reorder.
- List editor — pick items (with qty), pick groups (with multiplier qty),
  per-group "exclude these items" picker; reorder all entries.
- "Resolve" preview that shows the flattened item list with summed
  quantities (group qty × member defaultQty, minus exclusions). This
  preview is what the run mode in Phase 5 will work from.

**Prompt for next session:**
> *"TTN List Phase 4 — saved shopping lists. Build `/shopping/lists`
> (index + create + edit + delete + reorder) using the existing
> `useShoppingLists` etc. helpers. The list editor lets the user add
> entries that are either an item-with-qty OR a group-with-multiplier-and-
> exclusions. Provide a 'Preview' panel that resolves a list to a flat
> deduped item-with-qty array. Order is fully user-controlled within the
> entries array. Don't build the run mode yet — that's Phase 5. Don't
> touch chore/project pages. Acceptance: create a list mixing items and
> groups, exclude one member from one group, see the preview reflect the
> exclusion and summed qtys."*

### Phase 5 — Shop it run mode ✅
**Goal:** A focused checklist UI for working through a saved list in the
real world, with wake lock and end-of-run photos.
**Deliverables:**
- `/shopping/lists/:id/run` (or `/shopping/run/:sessionId`) — checklist
  with up/down reordering during the run (preserved into the session,
  not the underlying list).
- Acquire `navigator.wakeLock?.request('screen')` on mount; release on
  completion / unmount; re-acquire on `visibilitychange`. Surface state
  (active / unsupported) with a tiny indicator.
- Completion flow: review checked-off items, attach 0+ photos, optional
  notes, save as `ShoppingSession`.

**Prompt for next session:**
> *"TTN List Phase 5 — Shop it run mode. Build the run UI for a saved
> shopping list at `/shopping/lists/:id/run`: large tap targets, swipe-
> friendly, checkboxes with strike-through, up/down reordering during the
> run (writes only to the session, never the underlying list).
> Implement Screen Wake Lock acquisition with re-acquire on
> visibilitychange — best-effort, no fallback. On completion, attach 0+
> photos via `<PhotoPicker>` (multi), optional notes, then create a
> `ShoppingSession` via `createShoppingSession`. Don't touch other
> flavors. Acceptance: start a run, check items off, drag-reorder, attach
> two photos at the end, see the session in the DB via the Phase 6
> history view (or a temporary debug list)."*

### Phase 6 — Shopping history ✅
**Goal:** Browse past shopping sessions and re-shop a list.
**Deliverables:**
- `/shopping/history` — list of past `ShoppingSession`s newest-first,
  showing `listName` snapshot, completion time, item count, photo count.
- `/shopping/history/:id` — detail view with the resolved items, photos
  (lightbox-style viewer optional), notes.
- "Re-shop this list" button — creates a fresh session pre-populated from
  the original list (NOT from the historical session, in case the list
  was edited since).

**Prompt for next session:**
> *"TTN List Phase 6 — Shopping history. Use `useShoppingSessions` from
> [src/db/repo.ts](src/db/repo.ts) to list past sessions newest-first.
> Build `/shopping/history` and `/shopping/history/:id`. Re-shop = create
> a new session from the current state of the underlying list (lookup by
> `listId`). If the list no longer exists, show a 'list deleted' note and
> only allow viewing the historical record. Don't touch other flavors.
> Acceptance: complete a session in Phase 5's flow, see it on the history
> tab, tap into it, attempt re-shop after editing the list and verify the
> new session reflects the edits."*

### Phase 7 — Chores: items + routines + lists + Chore it + history ✅
**Goal:** Mirror Shopping for the Chores flavor.
**Deliverables:**
- All five Shopping pages reproduced for Chores. Where the data model
  matches (no qty, but otherwise identical), share components by passing
  flavor-specific repo hooks rather than copy-pasting the markup.
- A small `flavorConfig` map (icons, copy, repo hook bundle) feeds shared
  components.

**Prompt for next session:**
> *"TTN List Phase 7 — Chores. Mirror everything Shopping has (Phases
> 3-6) for Chores. Chores have **no quantity**: list entries are either a
> ChoreItem ref or a ChoreRoutine-with-optional-exclusions ref. Where
> Shopping and Chores components are structurally identical, extract a
> shared component that takes a `flavorConfig` prop (icons, labels, repo
> hook bundle) — don't bend the data model to share more than that.
> Don't touch Project pages. Acceptance: full CRUD + run + history loop
> on Chores at parity with Shopping minus qty."*

### Phase 8 — Projects: steps + processes + lists + Run it + history ✅
**Goal:** Mirror Chores for the Projects flavor.
**Deliverables:**
- Same shape as Chores. List entries are either a ProjectStep ref or a
  ProjectProcess-with-optional-exclusions ref.
- A "process" is intentionally a re-usable, named, ordered sequence of
  steps (e.g., "morning standup prep") — not a one-off plan. The
  `ProjectList` is what binds steps and processes into a run target.

**Prompt for next session:**
> *"TTN List Phase 8 — Projects. Same as Phase 7 but for Projects.
> Tier names: Step / Process / List (in code: ProjectStep,
> ProjectProcess, ProjectList). No quantity. A list mixes free-floating
> Steps with whole Processes (with optional `excludedStepIds`).
> Reuse the shared flavor-keyed components from Phase 7. Don't touch
> Shopping or Chore pages. Acceptance: full CRUD + run + history loop on
> Projects."*

### Phase 9 — Reminders + ICS deep links ✅
**Goal:** Generate `.ics` calendar files whose URL deep-links to a
specific saved list. Handle dead links gracefully.
**Deliverables:**
- `/reminders` — form: pick a list (across all three flavors), set
  date/time, set recurrence (none/daily/weekly+byDay/monthly), set
  reminder lead time, download `.ics` via the existing
  [src/lib/ics.ts](src/lib/ics.ts) helpers.
- Deep links target `/<flavor>/lists/:id`. The list-detail route checks
  for the ID and, if missing, navigates to `/` with a friendly toast
  ("That list is gone — start a new one?").

**Prompt for next session:**
> *"TTN List Phase 9 — Reminders + ICS. Adapt
> [../plot-my-notes/src/pages/Reminders.tsx](../plot-my-notes/src/pages/Reminders.tsx)
> as the structural reference (do NOT copy verbatim — TTN List has three
> flavors, not tracking types). Build `/reminders`: pick which saved
> list to deep-link to (across Shopping/Chores/Projects), set
> recurrence, download an `.ics`. URL format
> `<origin><BASE_URL>/<flavor>/lists/<id>`. Then in the list-detail
> route, if `:id` doesn't resolve, redirect to `/` and toast 'That list
> no longer exists — start a new one?'. Don't touch unrelated pages.
> Acceptance: generated `.ics` opens in Apple/Google Calendar with the
> right title, time, recurrence, and a tappable URL that lands on the
> right list (or shows the toast if you delete the list first)."*

### Phase 10 — Import / Export ✅
**Goal:** A working backup/restore flow in Settings.
**Deliverables:**
- "Export" button — calls `exportData()` and `downloadJson()` from
  [src/db/exportImport.ts](src/db/exportImport.ts) (already implemented).
- "Import…" button — file picker, then a confirm modal showing
  per-flavor counts and giving the user merge / replace choice.
- A re-render trigger after replace (the existing
  `setTimeout(location.reload, …)` pattern from plot-my-notes is fine).

**Prompt for next session:**
> *"TTN List Phase 10 — Import/Export UI in Settings. The transport layer
> ([src/db/exportImport.ts](src/db/exportImport.ts)) is already built and
> handles base64 photo encode/decode, merge vs replace, and runs
> everything in one Dexie transaction. You're only building the Settings
> UI: Export button (downloads `ttn-list-export-YYYY-MM-DD.json`),
> Import button (file picker → confirm modal showing per-flavor counts →
> merge or replace). Use the structure from
> [../plot-my-notes/src/pages/Settings.tsx](../plot-my-notes/src/pages/Settings.tsx)
> as a starting reference. Don't touch the transport layer. Acceptance:
> round-trip a non-trivial dataset (with photos) through export → wipe →
> import-replace, and confirm everything renders identically."*

### Phase 11 — Polish ✅
**Goal:** Branded look, clean copy, accessible, ships.
**Deliverables:**
- Branded icons (192/512 PNG + apple-touch-icon, and a refined SVG mark).
- Empty-state copy pass on every flavor page.
- Lighthouse PWA score ≥ 90; basic axe-core sweep for missing labels and
  contrast.
- Optional: replace `confirm()` calls with the in-app `<Modal>`.

**Prompt for next session:**
> *"TTN List Phase 11 — Polish. Generate proper PNG icons (192, 512,
> apple-touch-icon) replacing the SVG placeholders in `public/`. Run a
> copy pass on every empty state and primary action button. Run
> Lighthouse on the production build (`npm run build && npm run preview`)
> and address any PWA score < 90. Sweep for missing aria-labels on icon
> buttons and low-contrast text in dark mode. Don't add new features."*

---

## Progress Marker

**Done so far:** Phases 0-11. All three flavors complete (Shopping with
qty, Chores binary, Projects binary), each with full library + container-
tier + lists + Run mode + history + persisted resume. Reminders generate
`.ics` files that deep-link across all three flavors with dead-link
redirect on the editor pages. Import/Export round-trips everything
including base64-encoded photos. Branded SVG icons + PNG variants (180
apple-touch-icon, 192/512 any-purpose, 512 maskable). 45 resolver tests
covering qty math, exclusions, dedup, deletion handling. In-app Help page
under Settings. `npm run check` clean.

**Open follow-ups** tracked as GitHub issues:
- [#1](https://github.com/timtomnow/ttn-list/issues/1) — Run pages hang at "Preparing…" on dead deep-links.
- [#2](https://github.com/timtomnow/ttn-list/issues/2) — Photo cleanup on cascade delete.
- [#3](https://github.com/timtomnow/ttn-list/issues/3) — Extract shared shell across flavor pages.

---

## Future (post-v1)

1. **Recurring shopping lists** — auto-generate a fresh session at a cron-like
   interval ("every Sunday morning, 'weekly groceries'"). Currently you can
   only seed one via a calendar reminder.
2. **Sharing a list** — export a single list as a tiny shareable URL/QR
   code (no backend; encode in the URL). Receiver lands in TTN List with a
   pre-filled list to save or run.
3. **Smart re-order** — track which order items are typically checked off
   in a flavor, suggest reorder ("you usually start with produce").
4. **Voice add** — tap-and-hold a mic button on the items page, dictate
   names, an LLM splits them into discrete items.
