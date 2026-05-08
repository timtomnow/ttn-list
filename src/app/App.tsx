import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Shopping } from '@/pages/Shopping';
import { Chores } from '@/pages/Chores';
import { Projects } from '@/pages/Projects';
import { Reminders } from '@/pages/Reminders';
import { Settings } from '@/pages/Settings';
import { Help } from '@/pages/Help';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from './theme';

export function App() {
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
            <Route path="/settings/help" element={<Help />} />
            <Route path="*" element={<Navigate to="/shopping" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </ThemeProvider>
  );
}
