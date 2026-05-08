import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ShoppingCart,
  ListChecks,
  Hammer,
  Bell,
  Camera,
  Lock,
  Hourglass,
  Repeat,
  Database,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export function Help() {
  return (
    <div>
      <Link
        to="/settings"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ChevronLeft size={16} /> Settings
      </Link>
      <PageHeader title="Help" subtitle="How TTN List works." />

      <div className="space-y-6">
        <Section title="What this app is" icon={<HelpCircle size={18} />}>
          <p>
            TTN List is a local-first PWA for three flavors of repeated work:{' '}
            <strong>Shopping</strong>, <strong>Chores</strong>, and{' '}
            <strong>Projects</strong>. All three follow the same shape: build a
            library of reusable items, optionally bundle them into named
            groups, then assemble saved lists you can run with checkboxes.
            Everything lives in your browser — no account, no server.
          </p>
        </Section>

        <Section title="The three tiers" icon={<ListChecks size={18} />}>
          <p>Within each flavor there are three levels of structure:</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left dark:border-ink-800">
                <th className="py-2 pr-4 font-medium">Tier</th>
                <th className="py-2 pr-4 font-medium">Shopping</th>
                <th className="py-2 pr-4 font-medium">Chores</th>
                <th className="py-2 pr-4 font-medium">Projects</th>
              </tr>
            </thead>
            <tbody className="text-ink-700 dark:text-ink-300">
              <tr className="border-b border-ink-100 dark:border-ink-900">
                <td className="py-2 pr-4">Item</td>
                <td className="py-2 pr-4">an Item</td>
                <td className="py-2 pr-4">a Chore</td>
                <td className="py-2 pr-4">a Step</td>
              </tr>
              <tr className="border-b border-ink-100 dark:border-ink-900">
                <td className="py-2 pr-4">Container</td>
                <td className="py-2 pr-4">a Group</td>
                <td className="py-2 pr-4">a Routine</td>
                <td className="py-2 pr-4">a Process</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">List</td>
                <td className="py-2 pr-4">a Shopping List</td>
                <td className="py-2 pr-4">a Chore List</td>
                <td className="py-2 pr-4">a Project List</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3">
            A <strong>list</strong> can mix free-floating items with whole
            containers. When you run the list, containers expand to their
            members. You can exclude individual members on a per-list basis
            (the &ldquo;I already have lettuce&rdquo; case for shopping; the
            &ldquo;skip step 3 this time&rdquo; case for projects).
          </p>
        </Section>

        <Section title="Shopping has quantities; Chores and Projects are binary" icon={<ShoppingCart size={18} />}>
          <p>
            Only Shopping carries a quantity field. A list entry might say
            &ldquo;2 milk&rdquo; or &ldquo;1.5 lbs flour&rdquo;. Group members
            have a default qty that gets multiplied by the group&rsquo;s qty in
            the list (so &ldquo;Taco Tuesday × 2&rdquo; doubles every member
            qty). When the same item shows up across multiple entries, the
            run-mode preview sums them.
          </p>
          <p className="mt-2">
            Chores and Projects are simpler: each item or step is just done or
            not done. No qty, no math.
          </p>
        </Section>

        <Section title="Run modes — Shop it / Chore it / Run it" icon={<Lock size={18} />}>
          <p>
            Tap the play button next to a saved list to enter run mode. You
            get a focused checklist with large tap targets, in-run reordering
            via up/down arrows, and a screen wake-lock badge so the screen
            stays awake while you work.
          </p>
          <ul className="mt-2 space-y-1.5 list-disc pl-5">
            <li>
              <strong>Wake lock</strong> is best-effort. If it&rsquo;s not
              supported (older browsers, some desktop setups), the badge says{' '}
              &ldquo;may sleep&rdquo; and the screen behaves as normal.
            </li>
            <li>
              <strong>In-run reorder</strong> only affects this session, not
              the saved list itself.
            </li>
            <li>
              <strong>Wrap up</strong> opens the completion screen where you
              can attach photos and notes before saving the session to
              history.
            </li>
          </ul>
        </Section>

        <Section title="Resume a partially-completed run" icon={<Hourglass size={18} />}>
          <p>
            If you back out of a run mid-way (closed the tab, switched apps,
            tapped Lists), your progress is preserved. Returning to the lists
            page, the row for that list will show{' '}
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2 py-0.5 text-xs font-medium text-ink-50 dark:bg-ink-50 dark:text-ink-900">
              <Hourglass size={11} /> Continue (3/8)
            </span>{' '}
            instead of the play button. Tap to pick up exactly where you left
            off.
          </p>
          <p className="mt-2">
            To start over from scratch instead, open the run and tap the{' '}
            <strong>Restart</strong> icon (next to Done) — this discards the
            in-progress state and re-resolves from the current list.
          </p>
        </Section>

        <Section title="Photos" icon={<Camera size={18} />}>
          <p>
            Items, groups, routines, and processes can each carry a single
            photo (a thumbnail in lists). Sessions can carry many — useful for
            haul shots, before/afters, or receipt captures.
          </p>
          <p className="mt-2">
            Photos are stored as native blobs in your browser&rsquo;s
            IndexedDB, not as base64. They only get base64-encoded when you
            export a backup, and decoded back to blobs on import.
          </p>
        </Section>

        <Section title="History and re-running" icon={<Repeat size={18} />}>
          <p>
            Every completed run is saved as a session, viewable under each
            flavor&rsquo;s History tab. Sessions snapshot the list name, the
            full checked state, and any attached photos and notes.
          </p>
          <p className="mt-2">
            From a session detail page, &ldquo;Re-shop this list&rdquo; (or
            re-run, etc.) starts a fresh run from the <em>current</em> state of
            the underlying list — not the historical snapshot. If the list has
            been deleted in the meantime, the historical record is preserved
            but re-run is disabled.
          </p>
        </Section>

        <Section title="Reminders via .ics" icon={<Bell size={18} />}>
          <p>
            The Reminders tab generates an iCalendar file (.ics) you can
            import into your phone or computer&rsquo;s calendar. The reminder
            includes a deep link back to a specific list, so tapping the
            calendar notification jumps you straight into the list editor.
          </p>
          <p className="mt-2">
            Recurrence supports daily, weekly with by-day selection, and
            monthly. Schedules live in your calendar — TTN List doesn&rsquo;t
            store them. To change a reminder, edit it in your calendar or
            generate a new file here.
          </p>
        </Section>

        <Section title="Backup and restore" icon={<Database size={18} />}>
          <p>
            Settings has Export and Import buttons. Export downloads a single
            JSON file with everything: items, groups, lists, sessions, and
            photos (base64-encoded inline). Import accepts the same format and
            offers Merge or Replace:
          </p>
          <ul className="mt-2 space-y-1.5 list-disc pl-5">
            <li>
              <strong>Merge</strong> — add anything that doesn&rsquo;t already
              exist (matched by id). Existing data is untouched.
            </li>
            <li>
              <strong>Replace</strong> — wipe everything, then load the file.
              Cannot be undone. The page reloads after.
            </li>
          </ul>
          <p className="mt-2">
            Run an export before clearing browser data, switching devices, or
            experimenting destructively.
          </p>
        </Section>

        <Section title="Where things live" icon={<Hammer size={18} />}>
          <p>
            Everything is stored in IndexedDB inside your browser, scoped to
            this site. There is no server, no account, no telemetry. Photos
            are blobs in IndexedDB — install the app as a PWA to keep them
            available offline.
          </p>
          <p className="mt-2">
            Clearing site data, switching browsers, or signing out of your
            browser&rsquo;s sync will lose your data. Export first.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
        <span className="text-ink-500 dark:text-ink-400">{icon}</span>
        {title}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-700 dark:text-ink-300">
        {children}
      </div>
    </section>
  );
}
