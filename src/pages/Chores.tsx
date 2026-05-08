import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Package, FolderOpen, ListChecks, History, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useChoreItems, useChoreRoutines, useChoreLists, useChoreSessions } from '@/db/repo';
import { ChoreItems } from './chores/Items';
import { ChoreRoutines } from './chores/Routines';
import { ChoreRoutineEditor } from './chores/RoutineEditor';
import { ChoreLists } from './chores/Lists';
import { ChoreListEditor } from './chores/ListEditor';
import { ChoreRun } from './chores/Run';
import { ChoreHistory } from './chores/History';
import { ChoreHistoryDetail } from './chores/HistoryDetail';

export function Chores() {
  return (
    <Routes>
      <Route index element={<ChoreIndex />} />
      <Route path="items" element={<ChoreItems />} />
      <Route path="routines" element={<ChoreRoutines />} />
      <Route path="routines/new" element={<ChoreRoutineEditor />} />
      <Route path="routines/:id" element={<ChoreRoutineEditor />} />
      <Route path="lists" element={<ChoreLists />} />
      <Route path="lists/new" element={<ChoreListEditor />} />
      <Route path="lists/:id" element={<ChoreListEditor />} />
      <Route path="lists/:id/run" element={<ChoreRun />} />
      <Route path="history" element={<ChoreHistory />} />
      <Route path="history/:id" element={<ChoreHistoryDetail />} />
      <Route path="*" element={<Navigate to="/chores" replace />} />
    </Routes>
  );
}

function ChoreIndex() {
  const items = useChoreItems();
  const routines = useChoreRoutines();
  const lists = useChoreLists();
  const sessions = useChoreSessions({ limit: 1 });

  return (
    <div>
      <PageHeader title="Chores" subtitle="Items, routines, saved lists, and history." />
      <ul className="space-y-3">
        <SectionLink
          to="lists"
          icon={<ListChecks size={20} />}
          title="Lists"
          subtitle={`${lists?.length ?? 0} saved`}
          description="Saved chore lists you can run with the Chore it mode."
        />
        <SectionLink
          to="items"
          icon={<Package size={20} />}
          title="Items"
          subtitle={`${items?.length ?? 0} in library`}
          description="Reusable chores — wipe counter, take out trash, water plants."
        />
        <SectionLink
          to="routines"
          icon={<FolderOpen size={20} />}
          title="Routines"
          subtitle={`${routines?.length ?? 0} defined`}
          description="Bundles of chores. Add a routine to a list in one tap — morning prep, weekly clean."
        />
        <SectionLink
          to="history"
          icon={<History size={20} />}
          title="History"
          subtitle={sessions && sessions.length > 0 ? 'last run' : 'none yet'}
          description="Past sessions. Tap to view photos, notes, and re-run a list."
        />
      </ul>
    </div>
  );
}

function SectionLink({
  to,
  icon,
  title,
  subtitle,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700"
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{title}</span>
            <span className="text-xs text-ink-400 dark:text-ink-500">{subtitle}</span>
          </div>
          <p className="truncate text-xs text-ink-500 dark:text-ink-400">{description}</p>
        </div>
        <ChevronRight size={18} className="text-ink-400 dark:text-ink-500" />
      </Link>
    </li>
  );
}
