import type VaultHubPlugin from '~';
import { Notice } from 'obsidian';
import t from '~/i18n';
import { SyncRunKind } from '~/types';

export default function launchManualSync(plugin: VaultHubPlugin): void {
	if (plugin.isSyncing) {
		new Notice(t('sync.syncingFiles'));
		return;
	}

	if (!plugin.isAccountConfigured()) {
		new Notice(t('sync.error.accountNotConfigured'));
		return;
	}

	void plugin.syncSchedulerService.requestSync({
		runKind: SyncRunKind.normal,
		source: 'manual',
	});
}
