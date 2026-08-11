import type { App } from 'obsidian';
import type VaultHubPlugin from '~';
import type { SyncSettingTab } from '.';

export default abstract class BaseSettings {
	constructor(
		protected app: App,
		protected plugin: VaultHubPlugin,
		protected settings: SyncSettingTab,
		protected containerEl: HTMLElement,
	) {}

	abstract display(): void;
}
