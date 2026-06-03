import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Shopping } from '@/pages/Shopping';
import { Chores } from '@/pages/Chores';
import { Projects } from '@/pages/Projects';
import { Reminders } from '@/pages/Reminders';
import { Settings } from '@/pages/Settings';
import { HelpIndex, HelpAll, HelpSectionPage, GuidePage } from '@/pages/Help';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from './theme';
import { installTtnBackupAdapter } from '@/lib/ttnBackup';

export function App() {
  useEffect(() => {
    installTtnBackupAdapter();
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/shopping" replace />} />
            <Route path="/shopping/*" element={<Shopping />} />
            <Route path="/chores/*" element={<Chores />} />
            <Route path="/projects/*" element={<Projects />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<HelpIndex />} />
            <Route path="/help/all" element={<HelpAll />} />
            <Route path="/help/section/:section" element={<HelpSectionPage />} />
            <Route path="/help/:slug" element={<GuidePage />} />
            <Route path="/settings/help" element={<Navigate to="/help" replace />} />
            <Route path="*" element={<Navigate to="/shopping" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </ThemeProvider>
  );
}
