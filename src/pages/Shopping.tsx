import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Package, FolderOpen, ListChecks, History, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useShoppingItems, useShoppingGroups, useShoppingLists, useShoppingSessions } from '@/db/repo';
import { ShoppingItems } from './shopping/Items';
import { ShoppingGroups } from './shopping/Groups';
import { ShoppingGroupEditor } from './shopping/GroupEditor';
import { ShoppingLists } from './shopping/Lists';
import { ShoppingListEditor } from './shopping/ListEditor';
import { ShoppingRun } from './shopping/Run';
import { ShoppingHistory } from './shopping/History';
import { ShoppingHistoryDetail } from './shopping/HistoryDetail';

export function Shopping() {
  return (
    <Routes>
      <Route index element={<ShoppingIndex />} />
      <Route path="items" element={<ShoppingItems />} />
      <Route path="groups" element={<ShoppingGroups />} />
      <Route path="groups/new" element={<ShoppingGroupEditor />} />
      <Route path="groups/:id" element={<ShoppingGroupEditor />} />
      <Route path="lists" element={<ShoppingLists />} />
      <Route path="lists/new" element={<ShoppingListEditor />} />
      <Route path="lists/:id" element={<ShoppingListEditor />} />
      <Route path="lists/:id/run" element={<ShoppingRun />} />
      <Route path="history" element={<ShoppingHistory />} />
      <Route path="history/:id" element={<ShoppingHistoryDetail />} />
      <Route path="*" element={<Navigate to="/shopping" replace />} />
    </Routes>
  );
}

function ShoppingIndex() {
  const items = useShoppingItems();
  const groups = useShoppingGroups();
  const lists = useShoppingLists();
  const sessions = useShoppingSessions({ limit: 1 });

  return (
    <div>
      <PageHeader title="Shopping" subtitle="Items, groups, saved lists, and history." />
      <ul className="space-y-3">
        <SectionLink
          to="lists"
          icon={<ListChecks size={20} />}
          title="Lists"
          subtitle={`${lists?.length ?? 0} saved`}
          description="Saved shopping lists you can run with the Shop it mode."
        />
        <SectionLink
          to="items"
          icon={<Package size={20} />}
          title="Items"
          subtitle={`${items?.length ?? 0} in library`}
          description="Reusable line items — milk, lettuce, light bulbs."
        />
        <SectionLink
          to="groups"
          icon={<FolderOpen size={20} />}
          title="Groups"
          subtitle={`${groups?.length ?? 0} defined`}
          description="Recipe / meal bundles. Add a group to a list and bring all its items in one tap."
        />
        <SectionLink
          to="history"
          icon={<History size={20} />}
          title="History"
          subtitle={sessions && sessions.length > 0 ? 'last shop' : 'none yet'}
          description="Past sessions. Tap to view photos, notes, and re-shop a list."
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
