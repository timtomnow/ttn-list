import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Wrench, FolderOpen, ListChecks, History, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useProjectSteps, useProjectProcesses, useProjectLists, useProjectSessions } from '@/db/repo';
import { ProjectSteps } from './projects/Steps';
import { ProjectProcesses } from './projects/Processes';
import { ProjectProcessEditor } from './projects/ProcessEditor';
import { ProjectLists } from './projects/Lists';
import { ProjectListEditor } from './projects/ListEditor';
import { ProjectRun } from './projects/Run';
import { ProjectHistory } from './projects/History';
import { ProjectHistoryDetail } from './projects/HistoryDetail';

export function Projects() {
  return (
    <Routes>
      <Route index element={<ProjectIndex />} />
      <Route path="steps" element={<ProjectSteps />} />
      <Route path="processes" element={<ProjectProcesses />} />
      <Route path="processes/new" element={<ProjectProcessEditor />} />
      <Route path="processes/:id" element={<ProjectProcessEditor />} />
      <Route path="lists" element={<ProjectLists />} />
      <Route path="lists/new" element={<ProjectListEditor />} />
      <Route path="lists/:id" element={<ProjectListEditor />} />
      <Route path="lists/:id/run" element={<ProjectRun />} />
      <Route path="history" element={<ProjectHistory />} />
      <Route path="history/:id" element={<ProjectHistoryDetail />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}

function ProjectIndex() {
  const steps = useProjectSteps();
  const processes = useProjectProcesses();
  const lists = useProjectLists();
  const sessions = useProjectSessions({ limit: 1 });

  return (
    <div>
      <PageHeader title="Projects" subtitle="Steps, processes, saved lists, and history." />
      <ul className="space-y-3">
        <SectionLink to="lists" icon={<ListChecks size={20} />} title="Lists" subtitle={`${lists?.length ?? 0} saved`} description="Saved project lists you can run with the Run it mode." />
        <SectionLink to="steps" icon={<Wrench size={20} />} title="Steps" subtitle={`${steps?.length ?? 0} in library`} description="Reusable steps — sand the rail, prime, paint." />
        <SectionLink to="processes" icon={<FolderOpen size={20} />} title="Processes" subtitle={`${processes?.length ?? 0} defined`} description="Named ordered sequences of steps. Reusable across many projects." />
        <SectionLink to="history" icon={<History size={20} />} title="History" subtitle={sessions && sessions.length > 0 ? 'last run' : 'none yet'} description="Past sessions with photos and notes." />
      </ul>
    </div>
  );
}

function SectionLink({ to, icon, title, subtitle, description }: { to: string; icon: React.ReactNode; title: string; subtitle: string; description: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300">{icon}</div>
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
