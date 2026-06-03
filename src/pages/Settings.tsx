import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Monitor, Github, Database, Download, Upload, HelpCircle, ChevronRight, Archive, Sparkles, LayoutGrid } from 'lucide-react';
import { useTheme, type ThemePref } from '@/app/theme';
import { useRunPrefs, type RunDensity, type RunFontSize } from '@/hooks/useRunPrefs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  exportData,
  exportFilename,
  downloadJson,
  parseExportPayload,
  importData,
  type ExportPayload,
  type ImportMode,
  type ImportSummary,
} from '@/db/exportImport';
import { openTtnBackupRestore } from '@/lib/ttnBackup';
import { seedStarterShoppingItems } from '@/db/repo';

const REPO_URL = 'https://github.com/timtomnow/ttn-list';
const PORTFOLIO_URL = 'https://timtomnow.github.io/app-portfolio/';

export function Settings() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Theme, data, help, and about."
        action={
          <Link
            to="/help"
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
            aria-label="Help"
            title="Help"
          >
            <HelpCircle size={20} />
          </Link>
        }
      />

      <section className="mt-2">
        <Link
          to="/help"
          className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300">
            <HelpCircle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">Help &amp; Guides</div>
            <p className="truncate text-xs text-ink-500 dark:text-ink-400">
              Step-by-step walkthroughs — lists, run modes, photos, reminders, backup.
            </p>
          </div>
          <ChevronRight size={18} className="text-ink-400 dark:text-ink-500" />
        </Link>
      </section>

      <AppearanceSection />
      <StarterItemsSection />
      <DataSection />

      <section className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">About</h2>
        <div className="card p-5">
          <div className="text-base font-semibold">TTN List</div>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Local-first lists for shopping, chores, and projects. Build saved
            lists, run them, attach photos, keep a history.
          </p>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-ink-900 dark:text-ink-300 dark:hover:text-ink-50">
            <Github size={16} />
            github.com/timtomnow/ttn-list
          </a>
          <div className="mt-3">
            <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-ink-900 dark:text-ink-300 dark:hover:text-ink-50">
              <LayoutGrid size={16} />
              Check out my other apps on the portfolio site →
            </a>
          </div>
          <div className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-400 dark:border-ink-800 dark:text-ink-500">
            © {new Date().getFullYear()} timtomnow · v0.1 · local-first
          </div>
        </div>
      </section>
    </div>
  );
}

function AppearanceSection() {
  const { pref, setPref } = useTheme();
  const { prefs, setPrefs } = useRunPrefs();

  const themeOptions: { id: ThemePref; label: string; Icon: typeof Sun }[] = [
    { id: 'system', label: 'System', Icon: Monitor },
    { id: 'light', label: 'Light', Icon: Sun },
    { id: 'dark', label: 'Dark', Icon: Moon },
  ];

  const densityOptions: { id: RunDensity; label: string }[] = [
    { id: 'clean', label: 'Clean' },
    { id: 'condensed', label: 'Condensed' },
  ];

  const fontOptions: { id: RunFontSize; label: string; sz: string }[] = [
    { id: 'small', label: 'Small', sz: 'text-xs' },
    { id: 'default', label: 'Default', sz: 'text-sm' },
    { id: 'large', label: 'Large', sz: 'text-base' },
  ];

  const activeBtn = 'border-ink-900 bg-ink-900 text-ink-50 dark:border-ink-50 dark:bg-ink-50 dark:text-ink-900';
  const inactiveBtn = 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-ink-700';

  return (
    <section className="mt-2">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Appearance</h2>
      <div className="card p-5">
        <div className="text-sm font-medium">Theme</div>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">System follows your device setting.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {themeOptions.map(({ id, label, Icon }) => {
            const active = pref === id;
            return (
              <button key={id} type="button" onClick={() => setPref(id)} aria-pressed={active}
                className={['flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm transition', active ? activeBtn : inactiveBtn].join(' ')}>
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-t border-ink-100 pt-4 dark:border-ink-800">
          <div className="text-sm font-medium">Run view density</div>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Affects Shop It, Chore Run, and Project Run only.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {densityOptions.map(({ id, label }) => {
              const active = prefs.density === id;
              return (
                <button key={id} type="button" onClick={() => setPrefs({ density: id })} aria-pressed={active}
                  className={['flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition', active ? activeBtn : inactiveBtn].join(' ')}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium">Run view text size</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {fontOptions.map(({ id, label, sz }) => {
              const active = prefs.fontSize === id;
              return (
                <button key={id} type="button" onClick={() => setPrefs({ fontSize: id })} aria-pressed={active}
                  className={['flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2.5 transition', active ? activeBtn : inactiveBtn].join(' ')}>
                  <span className={[sz, 'font-medium'].join(' ')}>Aa</span>
                  <span className="text-xs">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function StarterItemsSection() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onSeed = async () => {
    setBusy(true);
    try {
      const added = await seedStarterShoppingItems();
      toast.show(
        added > 0
          ? `Added ${added} starter item${added === 1 ? '' : 's'}`
          : 'Starter items are already in your library',
      );
    } catch (e) {
      toast.show((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Shopping</h2>
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="font-medium">Starter grocery items</div>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              Load ~110 common grocery items into your Shopping library, each
              pre-tagged by category (Produce, Dairy, Cleaning, and so on).
              Items you already have are skipped, so it's safe to run again.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <button type="button" className="btn-primary" onClick={onSeed} disabled={busy}>
            <Sparkles size={14} /> Load starter items
          </button>
        </div>
      </div>
    </section>
  );
}

function DataSection() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<ExportPayload | null>(null);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    try {
      const payload = await exportData();
      downloadJson(exportFilename(), payload);
      toast.show('Backup downloaded');
    } catch (e) {
      toast.show((e as Error).message, 'error');
    }
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const payload = parseExportPayload(json);
      setPending(payload);
    } catch (err) {
      toast.show(`Could not read file: ${(err as Error).message}`, 'error');
    }
  };

  const runImport = async (mode: ImportMode) => {
    if (!pending) return;
    if (mode === 'replace') {
      const ok = confirm('Replace will delete every existing item, group, list, session, and photo, then load the file. This cannot be undone. Continue?');
      if (!ok) return;
    }
    setBusy(true);
    try {
      const summary = await importData(pending, mode);
      toast.show(summaryToToast(summary, mode));
      setPending(null);
      // After replace, force a full reload — many components hold derived
      // state that doesn't refresh from useLiveQuery alone.
      if (mode === 'replace') setTimeout(() => location.reload(), 600);
    } catch (err) {
      toast.show(`Import failed: ${(err as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Data</h2>
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300">
            <Database size={20} />
          </div>
          <div>
            <div className="font-medium">Backup &amp; restore</div>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              Everything is stored locally in your browser. Export a JSON
              backup before clearing site data, switching devices, or
              experimenting. Photos travel with the file (base64-encoded).
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={onExport}>
            <Download size={14} /> Export
          </button>
          <button type="button" className="btn-secondary" onClick={onPickFile}>
            <Upload size={14} /> Import…
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              try { openTtnBackupRestore(); }
              catch (e) { toast.show((e as Error).message, 'error'); }
            }}
          >
            <Archive size={14} /> Restore from ttn-backup
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={onFileChange} />
        </div>
        <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">
          ttn-backup is a separate utility that snapshots all your TTN apps into one bundle on a schedule. <a href="/ttn-backup/" className="underline">Open ttn-backup →</a>
        </p>
      </div>

      <ImportConfirmModal
        payload={pending}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={runImport}
      />
    </section>
  );
}

function summaryToToast(s: ImportSummary, mode: ImportMode): string {
  if (mode === 'replace') {
    return `Replaced: ${s.shoppingAdded} shopping, ${s.choresAdded} chores, ${s.projectsAdded} projects, ${s.photosAdded} photos.`;
  }
  const parts: string[] = [];
  if (s.shoppingAdded) parts.push(`+${s.shoppingAdded} shopping`);
  if (s.choresAdded) parts.push(`+${s.choresAdded} chores`);
  if (s.projectsAdded) parts.push(`+${s.projectsAdded} projects`);
  if (s.photosAdded) parts.push(`+${s.photosAdded} photos`);
  if (parts.length === 0) return 'Nothing new to import.';
  return `Merged: ${parts.join(', ')}.`;
}

function ImportConfirmModal({
  payload,
  busy,
  onCancel,
  onConfirm,
}: {
  payload: ExportPayload | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (mode: ImportMode) => void;
}) {
  if (!payload) return null;
  const exportedDate = new Date(payload.exportedAt).toLocaleString();
  const shopCount = payload.shoppingItems.length + payload.shoppingGroups.length + payload.shoppingLists.length + payload.shoppingSessions.length;
  const choreCount = payload.choreItems.length + payload.choreRoutines.length + payload.choreLists.length + payload.choreSessions.length;
  const projectCount = payload.projectSteps.length + payload.projectProcesses.length + payload.projectLists.length + payload.projectSessions.length;

  return (
    <Modal open onClose={busy ? () => undefined : onCancel} title="Import data">
      <div className="space-y-4 text-sm">
        <p className="text-ink-700 dark:text-ink-200">This file contains:</p>
        <ul className="space-y-1 rounded-xl bg-ink-50 p-3 text-ink-700 dark:bg-ink-800/40 dark:text-ink-200">
          <li><strong>{shopCount}</strong> shopping rows ({payload.shoppingItems.length} items, {payload.shoppingGroups.length} groups, {payload.shoppingLists.length} lists, {payload.shoppingSessions.length} sessions)</li>
          <li><strong>{choreCount}</strong> chore rows ({payload.choreItems.length} items, {payload.choreRoutines.length} routines, {payload.choreLists.length} lists, {payload.choreSessions.length} sessions)</li>
          <li><strong>{projectCount}</strong> project rows ({payload.projectSteps.length} steps, {payload.projectProcesses.length} processes, {payload.projectLists.length} lists, {payload.projectSessions.length} sessions)</li>
          <li><strong>{payload.photos.length}</strong> photos</li>
        </ul>
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Exported {exportedDate} (schema v{payload.version})
        </p>
        <div className="border-t border-ink-100 pt-4 dark:border-ink-800">
          <p className="text-sm font-medium">How should it be applied?</p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <button type="button" disabled={busy} onClick={() => onConfirm('merge')}
              className="rounded-xl border border-ink-200 p-3 text-left transition hover:border-ink-900 disabled:opacity-50 dark:border-ink-800 dark:hover:border-ink-50">
              <div className="font-medium">Merge</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">Add anything that doesn't already exist. Keep current data untouched.</div>
            </button>
            <button type="button" disabled={busy} onClick={() => onConfirm('replace')}
              className="rounded-xl border border-red-200 p-3 text-left transition hover:border-red-600 disabled:opacity-50 dark:border-red-900/50 dark:hover:border-red-500">
              <div className="font-medium text-red-700 dark:text-red-400">Replace</div>
              <div className="text-xs text-red-600 dark:text-red-400/80">Wipe current data, then load the file. Cannot be undone.</div>
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
