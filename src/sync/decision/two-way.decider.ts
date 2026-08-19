import { Notice } from 'obsidian';
import type { ProgressPatch } from '~/events';
import type { SyncRecord } from '~/storage';
import type { RecordStatsMap, StatsMap } from '~/types';
import postTraversal from '~/fs/post-traversal';
import { traverseVault } from '~/fs/vault';
import {
	getStat,
	isWebDavNotFoundError,
	remoteCollectionExists,
	traverseWebDAV,
} from '~/fs/webdav';
import t from '~/i18n';
import { useSettings } from '~/settings';
import { SyncRunKind } from '~/types';
import { resolveRemoteExecutionPath } from '~/utils/encryption';
import logger from '~/utils/logger';
import type SyncEngine from '..';
import type { BaseTask } from '../tasks/task.interface';
import type {
	OptionsWithBothFileStats,
	OptionsWithBothStats,
	OptionsWithLocalFileStat,
	OptionsWithLocalFolderStat,
	OptionsWithLocalStat,
	OptionsWithRemoteFileStat,
	OptionsWithRemoteFolderStat,
	OptionsWithRemoteStat,
	SyncDecisionInput,
	TaskFactory,
	TaskOptions,
} from './sync-decision.interface';
import AddRecordTask from '../tasks/add-record.task';
import CleanRecordTask from '../tasks/clean-record.task';
import MergeTask from '../tasks/merge.task';
import MkdirLocalTask from '../tasks/mkdir-local.task';
import MkdirRemoteTask from '../tasks/mkdir-remote.task';
import PullTask from '../tasks/pull.task';
import PushTask from '../tasks/push.task';
import RemoveLocalTask from '../tasks/remove-local.task';
import RemoveRemoteTask from '../tasks/remove-remote.task';
import twoWayDecider from './two-way.decider.function';

export default class TwoWaySyncDecider {
	constructor(
		private readonly sync: SyncEngine,
		private readonly token: string,
		private readonly syncRecordStorage: SyncRecord,
	) {}

	get webdav() {
		return this.sync.webdav;
	}

	get vault() {
		return this.sync.vault;
	}

	get remoteBaseDir() {
		return this.sync.remoteBaseDir;
	}

	async decide(options?: {
		onProgress?: (progress: ProgressPatch) => void;
		throwIfCancelled?: () => void;
	}): Promise<Array<BaseTask>> {
		const onProgress = (progress: ProgressPatch) => options?.onProgress?.(progress),
			records = await this.syncRecordStorage.getRecords(),
			currentLocalStats = await traverseVault({ vault: this.vault });

		onProgress({
			remoteWalkSummary: {
				completedItems: 0,
				currentItem: this.remoteBaseDir,
				totalItems: this.sync.runKind === SyncRunKind.fast && records.size > 0 ? 1 : 0,
			},
			stage: 'walking_remote',
		});
		const walkedRemoteStats = await loadCurrentRemoteStats({
				onProgress,
				records,
				remoteBaseDir: this.remoteBaseDir,
				runKind: this.sync.runKind,
				throwIfCancelled: options?.throwIfCancelled,
				token: this.token,
			}),
			currentRemoteStats = await discardStaleRemoteSnapshot(
				walkedRemoteStats,
				records,
				this.token,
				currentLocalStats,
			),
			commonTaskOptions = {
				remoteBaseDir: this.remoteBaseDir,
				syncRecord: this.syncRecordStorage,
				vault: this.vault,
				webdav: this.webdav,
			},
			taskFactory: TaskFactory = {
				createAddRecordTask: (opts: OptionsWithBothStats) =>
					new AddRecordTask({ ...commonTaskOptions, ...opts }),
				createCleanRecordTask: (opts: TaskOptions) =>
					new CleanRecordTask({ ...commonTaskOptions, ...opts }),
				createMergeTask: (opts: OptionsWithBothFileStats) =>
					new MergeTask({ ...commonTaskOptions, ...opts }),
				createMkdirLocalTask: (opts: OptionsWithRemoteFolderStat) =>
					new MkdirLocalTask({ ...commonTaskOptions, ...opts }),
				createMkdirRemoteTask: (opts: OptionsWithLocalFolderStat) =>
					new MkdirRemoteTask({ ...commonTaskOptions, ...opts }),
				createPullTask: (opts: OptionsWithRemoteFileStat) =>
					new PullTask({ ...commonTaskOptions, ...opts }),
				createPushTask: (opts: OptionsWithLocalFileStat) =>
					new PushTask({ ...commonTaskOptions, ...opts }),
				createRemoveLocalTask: (opts: OptionsWithLocalStat) =>
					new RemoveLocalTask({ ...commonTaskOptions, ...opts }),
				createRemoveRemoteTask: (opts: OptionsWithRemoteStat) =>
					new RemoveRemoteTask({ ...commonTaskOptions, ...opts }),
			},
			decisionInput: SyncDecisionInput = {
				currentLocalStats,
				currentRemoteStats,
				records,
				remoteBaseDir: this.remoteBaseDir,
				settings: {
					conflictStrategy: this.sync.settings.conflictStrategy,
					unmergeableStrategy: this.sync.settings.unmergeableStrategy,
				},
				taskFactory,
			},
			tasks = twoWayDecider(decisionInput),
			localHasFiles = [...currentLocalStats.values()].some((stat) => !stat.isDir),
			remoteHasFiles = [...currentRemoteStats.values()].some((stat) => !stat.isDir);

		if (tasks.length === 0 && !localHasFiles && !remoteHasFiles) {
			logger.warn('Local vault and remote directory both have no files', {
				remoteBaseDir: this.remoteBaseDir,
			});
			new Notice(t('sync.remoteDirectoryEmpty'), 8000);
		}

		return tasks;
	}
}

async function extractRemoteRecords(records: RecordStatsMap): Promise<StatsMap> {
	const res: StatsMap = new Map(),
		{ filterRules, skipLargeFiles } = await useSettings();
	for (const [path, record] of records) res.set(path, record.remote);
	return postTraversal(
		res,
		filterRules,
		skipLargeFiles.enabled ? skipLargeFiles.value : undefined,
	);
}

async function loadCurrentRemoteStats({
	onProgress,
	records,
	remoteBaseDir,
	runKind,
	throwIfCancelled,
	token,
}: {
	onProgress: (progress: ProgressPatch) => void;
	records: RecordStatsMap;
	remoteBaseDir: string;
	runKind: SyncRunKind;
	throwIfCancelled?: () => void;
	token: string;
}): Promise<StatsMap> {
	const { customHeaders, serverUrl } = await useSettings(),
		exists = await remoteCollectionExists(serverUrl, token, remoteBaseDir, customHeaders);
	if (!exists) {
		logger.warn('Remote base directory is missing; treating remote as empty', {
			remoteBaseDir,
		});
		return new Map();
	}
	if (runKind === SyncRunKind.fast && records.size > 0) return extractRemoteRecords(records);
	return traverseWebDAV({
		onProgress: (progress) =>
			onProgress({
				remoteWalkSummary: {
					completedItems: progress.processedDirectories,
					currentItem: progress.currentDirectory ?? remoteBaseDir,
					totalItems: progress.totalDirectories,
				},
				stage: 'walking_remote',
			}),
		throwIfCancelled,
		token,
	});
}

async function discardStaleRemoteSnapshot(
	remoteStats: StatsMap,
	records: RecordStatsMap,
	token: string,
	localStats: StatsMap,
): Promise<StatsMap> {
	if (remoteStats.size === 0) return remoteStats;
	if (![...localStats.values()].some((stat) => !stat.isDir)) return remoteStats;

	const { customHeaders, serverUrl } = await useSettings(),
		samples: Array<string> = [];
	for (const [path, stat] of remoteStats) {
		if (stat.isDir || !records.has(path)) continue;
		samples.push(stat.path);
		if (samples.length >= 3) break;
	}
	if (samples.length === 0) return remoteStats;

	for (const virtualPath of samples) {
		const executionPath = await resolveRemoteExecutionPath(virtualPath);
		try {
			await getStat(serverUrl, token, executionPath, customHeaders);
			return remoteStats;
		} catch (error) {
			if (!isWebDavNotFoundError(error)) throw error;
		}
	}

	logger.warn('Recorded remote files are gone; treating the remote snapshot as empty');
	return new Map();
}
