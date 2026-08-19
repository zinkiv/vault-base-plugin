import './global.css';
import { Plugin } from 'obsidian';
import type { PluginSettings, GlobMatchOptions } from './settings';
import type { SyncEncryptionContext } from './utils/encryption';
import SyncRibbonManager from './components/SyncRibbonManager';
import apiLimiter from './composable/api-limiter';
import { syncCancel } from './events';
import { normalizeBaseDir } from './platform/path';
import setupCommands from './services/command.setup';
import ObservabilityService from './services/observability.service';
import SyncExecutorService from './services/sync-executor.service';
import SyncSchedulerService from './services/sync-scheduler.service';
import { WebDAVService } from './services/webdav.service';
import {
	SyncSettingTab,
	setPluginInstance,
	ConflictStrategy,
	UnmergeableStrategy,
} from './settings';
import {
	IndexedDbBaseTextStore,
	IndexedDbFileChunkStore,
	IndexedDbSyncStateStore,
} from './storage';
import { createSyncEncryptionContext } from './utils/encryption';
import getCredential from './utils/get-credential';
import { getSyncStateKey } from './utils/get-sync-state-key';
import patchWebDav from './webdav-patch';

function createGlobMatchOptions(expr: string) {
	return {
		expr,
		options: {
			caseSensitive: false,
		},
	} satisfies GlobMatchOptions;
}

export default class VaultHubPlugin extends Plugin {
	public isSyncing = false;
	private syncEncryptionContext: SyncEncryptionContext | undefined;
	public settings: PluginSettings = {
		account: '',
		confirmBeforeDeleteInAutoSync: true,
		conflictStrategy: ConflictStrategy.DiffMatchPatch,
		customHeaders: {},
		encryption: {
			enabled: false,
			value: '',
		},
		exhaustiveRemoteTraversal: false,
		fastRealtimeSync: true,
		filterRules: {
			exclusionRules: [
				'**/.git',
				'**/.github',
				'**/.gitlab',
				'**/.svn',
				'**/node_modules',
				'**/.DS_Store',
				'**/__MACOSX',
				'**/desktop.ini',
				'**/Thumbs.db',
				'**/.trash',
				'**/~$*.doc',
				'**/~$*.docx',
				'**/~$*.ppt',
				'**/~$*.pptx',
				'**/~$*.xls',
				'**/~$*.xlsx',
				this.app.vault.configDir,
			].map(createGlobMatchOptions),
			inclusionRules: [],
		},
		maxSyncTaskConcurrency: {
			enabled: true,
			value: 100,
		},
		maxThroughputConcurrency: {
			enabled: true,
			value: 52_428_800,
		},
		maxWebDAVConcurrency: {
			enabled: true,
			value: 100,
		},
		minWebDAVRequestInterval: {
			enabled: false,
			value: 0,
		},
		realtimeSync: {
			enabled: false,
			value: 5000,
		},
		remoteDir: normalizeBaseDir(this.app.vault.getName()),
		scheduledSync: {
			enabled: false,
			value: 6000,
		},
		serverUrl: '',
		skipLargeFiles: {
			enabled: false,
			value: 31_457_280,
		},
		startupSync: {
			enabled: false,
			value: 10_000,
		},
		token: '',
		unmergeableStrategy: UnmergeableStrategy.LatestTimeStamp,
		useGitStyle: false,
	};

	public syncStateStore = new IndexedDbSyncStateStore();
	public baseTextStore = new IndexedDbBaseTextStore();
	public fileChunkStore = new IndexedDbFileChunkStore();
	public observabilityService = new ObservabilityService(this);
	public webDAVService = new WebDAVService(this);
	public syncExecutorService = new SyncExecutorService(this);
	public syncSchedulerService = new SyncSchedulerService(this, this.syncExecutorService);
	public ribbonManager = new SyncRibbonManager(this);

	async onload() {
		Object.assign(this.settings, await this.loadData());
		this.applyWebDavLimits();
		await this.syncStateStore.initialize();
		await this.baseTextStore.initialize();
		await this.fileChunkStore.initialize();
		this.addSettingTab(new SyncSettingTab(this.app, this));
		setPluginInstance(this);
		setupCommands(this);
		this.syncSchedulerService.start();
		patchWebDav();
	}

	onunload() {
		setPluginInstance(undefined);
		void this.syncStateStore.unload();
		void this.baseTextStore.unload();
		void this.fileChunkStore.unload();
		syncCancel();
		this.syncSchedulerService.unload();
		this.observabilityService.unload();
	}

	saveSettings = async () => await this.saveData(this.settings);

	private applyWebDavLimits() {
		const { maxWebDAVConcurrency, minWebDAVRequestInterval } = this.settings;
		apiLimiter.maxConcurrency = maxWebDAVConcurrency.enabled
			? maxWebDAVConcurrency.value
			: Number.POSITIVE_INFINITY;
		apiLimiter.minInterval = minWebDAVRequestInterval.enabled
			? minWebDAVRequestInterval.value
			: 0;
	}

	toggleSyncUI(isSyncing: boolean) {
		this.isSyncing = isSyncing;
		this.ribbonManager.update();
	}

	getToken() {
		const token = `${this.settings.account}:${getCredential(this)}`;
		return btoa(token);
	}

	prepareSyncEncryptionKeys() {
		this.syncEncryptionContext = undefined;
	}

	getSyncEncryptionKeys() {
		return this.getSyncEncryptionContext().keysPromise;
	}

	getSyncEncryptionContext() {
		this.syncEncryptionContext ??= createSyncEncryptionContext(
			this.settings,
			this.app.secretStorage,
		);
		return this.syncEncryptionContext;
	}

	clearSyncEncryptionKeys() {
		this.syncEncryptionContext = undefined;
	}

	async clearSyncRecords() {
		const namespace = getSyncStateKey({
			account: this.settings.account,
			remoteBaseDir: this.settings.remoteDir,
			serverUrl: this.settings.serverUrl,
			vaultName: this.app.vault.getName(),
		});
		await Promise.all([
			this.syncStateStore.removeNamespace(namespace),
			this.baseTextStore.removeNamespace(namespace),
			this.fileChunkStore.removeNamespace(namespace),
		]);
	}

	/**
	 * 检查账号配置是否完整
	 * @returns true 表示配置完整，false 表示未配置或配置不完整
	 */
	isAccountConfigured(): boolean {
		return (
			Boolean(this.settings.serverUrl) &&
			this.settings.serverUrl.trim() !== '' &&
			Boolean(this.settings.account) &&
			this.settings.account.trim() !== '' &&
			Boolean(this.settings.token) &&
			this.settings.token.trim() !== '' &&
			Boolean(this.app.secretStorage.getSecret(this.settings.token))
		);
	}
}
