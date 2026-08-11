import type { TextComponent } from 'obsidian';
import { Notice } from 'obsidian';
import type { PluginSettings } from '~/settings';
import t from '~/i18n';
import type VaultHubPlugin from '..';

export default function handleInput<T extends keyof PluginSettings>({
	text,
	plugin,
	field,
	processValue,
	stringify = (value: PluginSettings[T]) =>
		typeof value === 'string'
			? value
			: typeof value === 'boolean' || typeof value === 'number'
				? value.toString()
				: '',
}: {
	text: TextComponent;
	plugin: VaultHubPlugin;
	field: T;
	processValue: (value: string) => PluginSettings[T] | false;
	stringify?: (value: PluginSettings[T]) => string;
}) {
	text.inputEl.addEventListener('blur', () => {
		const value = processValue(text.getValue());
		if (value === false) new Notice(t('settings.invalidValue'));
		else if (plugin.settings[field] !== value) {
			plugin.settings[field] = value;
			void plugin.saveSettings();
		}
		text.setValue(stringify(plugin.settings[field]));
	});
}
