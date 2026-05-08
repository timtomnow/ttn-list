import { Sun, Moon, Monitor, Github } from 'lucide-react';
import { useTheme, type ThemePref } from '@/app/theme';
import { PageHeader } from '@/components/ui/PageHeader';

const REPO_URL = 'https://github.com/timtomnow/ttn-list';

export function Settings() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Theme, data, and about." />

      <AppearanceSection />

      <section className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">
          Data
        </h2>
        <div className="card p-5 text-sm text-ink-500 dark:text-ink-400">
          Backup &amp; restore lands in Phase 10. The transport layer
          (<code className="font-mono">src/db/exportImport.ts</code>) is already
          wired to round-trip everything including base64-encoded photos.
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">
          About
        </h2>
        <div className="card p-5">
          <div className="text-base font-semibold">TTN List</div>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Local-first lists for shopping, chores, and projects. Build saved
            lists, run them, attach photos, keep a history.
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-ink-900 dark:text-ink-300 dark:hover:text-ink-50"
          >
            <Github size={16} />
            github.com/timtomnow/ttn-list
          </a>
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
  const options: { id: ThemePref; label: string; Icon: typeof Sun }[] = [
    { id: 'system', label: 'System', Icon: Monitor },
    { id: 'light', label: 'Light', Icon: Sun },
    { id: 'dark', label: 'Dark', Icon: Moon },
  ];
  return (
    <section className="mt-2">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">
        Appearance
      </h2>
      <div className="card p-5">
        <div className="text-sm font-medium">Theme</div>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          System follows your device setting.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {options.map(({ id, label, Icon }) => {
            const active = pref === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPref(id)}
                aria-pressed={active}
                className={[
                  'flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm transition',
                  active
                    ? 'border-ink-900 bg-ink-900 text-ink-50 dark:border-ink-50 dark:bg-ink-50 dark:text-ink-900'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-ink-700',
                ].join(' ')}
              >
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
