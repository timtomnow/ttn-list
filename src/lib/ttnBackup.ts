// ttn-backup integration. See https://timtomnow.github.io/ttn-backup/
//
// Exposes `window.TTNBackupAdapter` so the ttn-backup utility can snapshot /
// restore TTN List from a hidden iframe. Also exposes a thin wrapper that
// opens the cross-app Restore picker.

import {
  exportData,
  importData,
  parseExportPayload,
  type ExportPayload,
} from '@/db/exportImport';

type TTNBackupAdapter = {
  appId: string;
  appName: string;
  version: number;
  exportData: () => Promise<ExportPayload>;
  importData: (data: unknown) => Promise<void>;
};

declare global {
  interface Window {
    TTNBackupAdapter?: TTNBackupAdapter;
    TTNBackup?: {
      openImport: (appId: string) => Promise<void>;
      listBundlesFor: (appId: string) => Promise<unknown[]>;
      __loaded?: boolean;
    };
  }
}

export function installTtnBackupAdapter(): void {
  window.TTNBackupAdapter = {
    appId: 'ttn-list',
    appName: 'TTN List',
    version: 1,
    exportData,
    importData: async (data) => {
      const payload = parseExportPayload(data);
      await importData(payload, 'replace');
      // Many components hold derived state that won't refresh from useLiveQuery
      // alone after a wholesale data swap. Mirror the in-app import flow's
      // behaviour and force a reload.
      setTimeout(() => location.reload(), 100);
    },
  };
}

export function openTtnBackupRestore(): void {
  if (window.TTNBackup?.openImport) {
    void window.TTNBackup.openImport('ttn-list');
  } else {
    throw new Error('ttn-backup client not loaded. Check that /ttn-backup/client.js is reachable.');
  }
}
