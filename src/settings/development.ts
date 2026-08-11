import { Notice, Setting } from 'obsidian';
import t from '~/i18n';
import BaseSettings from './settings.base';

export default class DevelopmentSettings extends BaseSettings {
	display() {
		this.containerEl.empty();
		new Setting(this.containerEl).setName(t('settings.sections.development')).setHeading();

		new Setting(this.containerEl)
			.setName(t('settings.clearRecords.name'))
			.setDesc(t('settings.clearRecords.desc'))
			.addButton((button) =>
				button
					.setButtonText(t('settings.clearRecords.button'))
					.onClick(() => void this.clearRecords()),
			);
	}

	private async clearRecords() {
		await this.plugin.clearSyncRecords();
		new Notice(t('settings.clearRecords.cleared'));
	}
}
