import type VaultHubPlugin from '~';
import { Notice } from 'obsidian';
import { syncCancel } from '~/events';
import t from '~/i18n';
import launchManualSync from '~/utils/launch-manual-sync';

export default function setupCommands(plugin: VaultHubPlugin) {
	plugin.addCommand({
		checkCallback: (checking) => {
			if (plugin.isSyncing) return false;
			if (checking) return true;
			launchManualSync(plugin);
		},
		icon: 'refresh-cw',
		id: 'start-sync',
		name: t('sync.startButton'),
	});

	plugin.addCommand({
		checkCallback: (checking) => {
			if (plugin.isSyncing) {
				if (!checking) syncCancel();
				return true;
			}
			return false;
		},
		icon: 'x-circle',
		id: 'stop-sync',
		name: t('sync.stopButton'),
	});

	plugin.addCommand({
		callback: () => {
			void plugin.clearSyncRecords().then(() => {
				new Notice(t('settings.clearRecords.cleared'));
			});
		},
		icon: 'trash',
		id: 'clear-sync-records',
		name: t('settings.clearRecords.button'),
	});
}
