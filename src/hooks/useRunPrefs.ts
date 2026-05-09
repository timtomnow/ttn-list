import { useCallback, useState } from 'react';

export type RunDensity = 'clean' | 'condensed';
export type RunFontSize = 'default' | 'small' | 'large';

export interface RunPrefs {
  density: RunDensity;
  fontSize: RunFontSize;
}

const KEY = 'ttn-run-prefs';

function load(): RunPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<RunPrefs>;
      return {
        density: p.density === 'condensed' ? 'condensed' : 'clean',
        fontSize: p.fontSize === 'small' ? 'small' : p.fontSize === 'large' ? 'large' : 'default',
      };
    }
  } catch { /* ignore parse errors */ }
  return { density: 'clean', fontSize: 'default' };
}

export function useRunPrefs() {
  const [prefs, setPrefsState] = useState<RunPrefs>(load);
  const setPrefs = useCallback((update: Partial<RunPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...update };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore quota errors */ }
      return next;
    });
  }, []);
  return { prefs, setPrefs };
}
