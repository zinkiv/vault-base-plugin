import type { Vault } from 'obsidian';
import type { WebDAVClient } from 'webdav';
import type {
	SyncFailedTaskInfo,
	SyncProgressSummary,
	SyncRunSnapshot,
	ProgressPatch,
	SyncPlanSummary,
} from '~/events';
import type { SyncExecutionRequest } from '~/services/sync-executor.service';
import DeleteConfirmModal from '~/components/DeleteConfirmModal';
import RemoteDeleteConfirmModal from '~/components/RemoteDeleteConfirmModal';
import { syncRun, syncCancel, updateSyncRunSnapshot } from '~/events';
import finalizeSyncRun from '~/events/sync-terminate';
import { statItem } from '~/fs/vault';
import { createRemoteDirectories, remoteCollectionExists } from '~/fs/webdav';
import t from '~/i18n';
import { SyncRecord } from '~/storage';
import { SyncRunKind } from '~/types';
import breakableSleep from '~/utils/breakable-sleep';
import { getSyncStateKey } from '~/utils/get-sync-state-key';
import { getTaskName } from '~/utils/get-task-info';
import isRetryableError from '~/utils/is-retryable-error';
import logger from '~/utils/logger';
import type VaultHubPlugin from '..';
import type { BaseTask, TaskResult } from './tasks/task.interface';
import TwoWaySyncDecider from './decision/two-way.decider';
import {
	SyncCancelledError,
	SyncRetryExhaustedError,
	isSyncCancelledError,
	toError,
} from './errors';
import AddRecordTask from './tasks/add-record.task';
import CleanRecordTask from './tasks/clean-record.task';
import MkdirLocalTask from './tasks/mkdir-local.task';
import MkdirRemoteTask from './tasks/mkdir-remote.task';
import PullTask from './tasks/pull.task';
import PushTask from './tasks/push.task';
import RemoveLocalTask from './tasks/remove-local.task';
import RemoveRemoteTask from './tasks/remove-remote.task';
import { TaskError } from './tasks/task.interface';
import shouldKeepRemoteOnAutoSync from './utils/keep-remote-on-auto';
import optimizeTasks from './utils/optimize-tasks';

type SyncResultSummary = {
	totalTasks: number;
	succeededTasks: number;
	failedTasks: number;
	failed: Array<SyncFailedTaskInfo>;
};

export default class SyncEngine {
	isCancelled = false;

	private readonly unsubscribeSyncCancel: () => void;

	constructor(
		private readonly plugin: VaultHubPlugin,
		private readonly options: {
			vault: Vault;
			webdav: WebDAVClient;
			token: string;
		},
	) {
		this.options = Object.freeze(this.options);
		this.unsubscribeSyncCancel = syncCancel.subscribe(() => (this.isCancelled = true));
	}

	runKind: SyncRunKind = SyncRunKind.normal;

	async preparePlan(
		runKind: SyncRunKind = SyncRunKind.normal,
		onProgress?: (progress: ProgressPatch) => void,
	): Promise<Array<BaseTask>> {
		this.runKind = runKind;
		const syncRecord = this.createSyncRecord();
		await this.ensureRemoteBaseDirReady(syncRecord);
		this.throwIfCancelled();

		const tasks = await new TwoWaySyncDecider(this, this.options.token, syncRecord).decide({
			onProgress,
			throwIfCancelled: this.throwIfCancelled,
		});
		this.throwIfCancelled();

		return tasks;
	}

	async start({
		request,
		tasks,
		run,
	}: {
		request: SyncExecutionRequest;
		tasks: Array<BaseTask>;
		run: SyncRunSnapshot;
	}): Promise<SyncRunSnapshot> {
		try {
			this.runKind = request.runKind;

			const settings = this.settings;
			let currentRun = updateSyncRunSnapshot(run, {
				planSummary: this.summarizePlan(tasks),
			});
			syncRun(currentRun);
			logger.info('Execution started');

			if (tasks.length === 0) {
				currentRun = finalizeSyncRun(currentRun, {
					patch: {
						resultSummary: {
							failed: [],
							failedTasks: 0,
							succeededTasks: 0,
							totalTasks: 0,
						},
					},
					stage: 'completed_noop',
				});
				return currentRun;
			}

			if (this.isCancelled) {
				currentRun = finalizeSyncRun(currentRun, { stage: 'cancelled' });
				return currentRun;
			}

			const removeRemoteTasks = tasks.filter((task) => task instanceof RemoveRemoteTask),
				localFileCount = this.vault.getFiles().length;
			if (removeRemoteTasks.length > 0)
				if (shouldKeepRemoteOnAutoSync(request.trigger, localFileCount)) {
					logger.warn('Skipping remote deletion during auto sync; downloading instead', {
						localFileCount,
						trigger: request.trigger,
					});
					const downloadTasks = this.convertRemoteDeleteToDownload(removeRemoteTasks),
						otherTasks = tasks.filter((task) => !(task instanceof RemoveRemoteTask));
					tasks = [...downloadTasks, ...otherTasks];
				} else {
					currentRun = updateSyncRunSnapshot(currentRun, {
						planSummary: {
							...this.summarizePlan(tasks),
							requiresDeleteConfirmation: true,
							warnings: [
								{
									code: 'remote_delete_confirmation',
									messageKey: 'deleteConfirm.remoteWarningNotice',
								},
							],
						},
						stage: 'awaiting_confirmation',
						timestamps: {
							confirmationStartedAt:
								currentRun.timestamps.confirmationStartedAt ?? Date.now(),
						},
					});
					syncRun(currentRun);
					const { tasksToDelete, tasksToDownload } = await new RemoteDeleteConfirmModal(
							this.app,
							removeRemoteTasks,
						).openAndWait(),
						downloadTasks = this.convertRemoteDeleteToDownload(tasksToDownload),
						otherTasks = tasks.filter((task) => !(task instanceof RemoveRemoteTask));
					tasks = [...tasksToDelete, ...downloadTasks, ...otherTasks];
				}

			if (this.isCancelled) {
				currentRun = finalizeSyncRun(currentRun, { stage: 'cancelled' });
				return currentRun;
			}

			// Check for RemoveLocalTask during auto-sync and ask for confirmation
			if (request.trigger !== 'manual' && settings.confirmBeforeDeleteInAutoSync) {
				const removeLocalTasks = tasks.filter((task) => task instanceof RemoveLocalTask),
					otherTasks = tasks.filter((task) => !(task instanceof RemoveLocalTask));
				if (removeLocalTasks.length > 0) {
					currentRun = updateSyncRunSnapshot(currentRun, {
						planSummary: {
							...this.summarizePlan(tasks),
							requiresDeleteConfirmation: true,
							warnings: [
								{
									code: 'delete_confirmation',
									messageKey: 'deleteConfirm.warningNotice',
								},
							],
						},
						stage: 'awaiting_confirmation',
						timestamps: {
							confirmationStartedAt:
								currentRun.timestamps.confirmationStartedAt ?? Date.now(),
						},
					});
					syncRun(currentRun);
					const { tasksToDelete, tasksToReupload } = await new DeleteConfirmModal(
							this.app,
							removeLocalTasks,
						).openAndWait(),
						reuploadTasks = await this.convertDeleteToUpload(tasksToReupload);

					tasks = [...tasksToDelete, ...reuploadTasks, ...otherTasks];
				}
			}

			const optimizedTaskGroups = optimizeTasks(
					tasks,
					settings.maxSyncTaskConcurrency,
					settings.maxThroughputConcurrency,
				),
				optimizedTasks = optimizedTaskGroups.flat(),
				allTasksResult: Array<TaskResult> = [],
				totalDisplayableTasks = optimizedTasks.filter((task) =>
					this.isDisplayableTask(task),
				),
				// Track all completed tasks across all batches
				allCompletedTasks: Array<BaseTask> = [];
			currentRun = updateSyncRunSnapshot(currentRun, {
				planSummary: this.summarizePlan(optimizedTasks),
				progressSummary: this.createProgressSummary(
					totalDisplayableTasks,
					allCompletedTasks,
				),
				stage: 'executing',
				timestamps: { executionStartedAt: Date.now() },
			});
			syncRun(currentRun);

			for (const taskGroup of optimizedTaskGroups) {
				if (this.isCancelled) break;

				const groupExecution = await this.execTaskGroup(
					currentRun,
					taskGroup,
					totalDisplayableTasks,
					allCompletedTasks,
				);
				currentRun = groupExecution.run;
				allTasksResult.push(...groupExecution.results);
			}

			const resultSummary = this.createResultSummary(allTasksResult),
				failedCount = resultSummary.failedTasks;
			currentRun = finalizeSyncRun(currentRun, {
				patch: {
					errorSummary:
						failedCount > 0
							? {
									message: t('sync.completeWithFailed', { failedCount }),
								}
							: undefined,
					progressSummary: this.createProgressSummary(
						totalDisplayableTasks,
						allCompletedTasks,
					),
					resultSummary,
				},
				stage: this.isCancelled ? 'cancelled' : failedCount > 0 ? 'failed' : 'completed',
			});
			return currentRun;
		} catch (error) {
			const failedRun = finalizeSyncRun(run, {
				error,
				stage: isSyncCancelledError(error) ? 'cancelled' : 'failed',
			});
			return failedRun;
		} finally {
			this.unsubscribeSyncCancel();
		}
	}

	summarizePlan(tasks: Array<BaseTask>): SyncPlanSummary {
		return {
			requiresConfirmation: false,
			requiresDeleteConfirmation: false,
			totalTasks: tasks.length,
			warnings: [],
		};
	}

	private async convertDeleteToUpload(tasks: Array<RemoveLocalTask>) {
		const final: Array<PushTask | MkdirRemoteTask> = [];
		for (const task of tasks) {
			const options = task.options,
				local = await statItem(this.vault, options.localPath);
			if (!local)
				throw new Error(`Local file item not found during reupload: ${options.localPath}`);
			if (local.isDir) final.push(new MkdirRemoteTask({ ...options, local }));
			else final.push(new PushTask({ ...options, local }));
		}
		return final;
	}

	private convertRemoteDeleteToDownload(tasks: Array<RemoveRemoteTask>) {
		const final: Array<PullTask | MkdirLocalTask> = [];
		for (const task of tasks) {
			const options = task.options,
				remote = options.remote;
			if (!remote)
				throw new Error(
					`Remote file item not found during download: ${options.remotePath}`,
				);
			if (remote.isDir) final.push(new MkdirLocalTask({ ...options, remote }));
			else final.push(new PullTask({ ...options, remote }));
		}
		return final;
	}

	private isDisplayableTask(task: BaseTask): boolean {
		return !(task instanceof CleanRecordTask) && !(task instanceof AddRecordTask);
	}

	private createSyncRecord() {
		return new SyncRecord(
			this.getStateKey(),
			this.plugin.syncStateStore,
			this.plugin.baseTextStore,
			this.plugin.fileChunkStore,
		);
	}

	private async ensureRemoteBaseDirReady(syncRecord: SyncRecord) {
		const { customHeaders, remoteDir, serverUrl } = this.settings,
			token = this.options.token;

		let remoteBaseDirExists = await this.retryWebDAVCall(() =>
			remoteCollectionExists(serverUrl, token, remoteDir, customHeaders),
		);

		if (!remoteBaseDirExists) {
			if (this.vault.getFiles().length === 0) {
				logger.warn(
					'Remote base directory is missing and local vault is empty; not creating it',
					{ remoteDir },
				);
				return;
			}
			logger.warn(
				'Remote base directory is missing; dropping sync records and recreating it',
				{
					remoteDir,
				},
			);
			await syncRecord.drop();
		}

		while (!remoteBaseDirExists) {
			this.throwIfCancelled();

			try {
				await this.retryWebDAVCall(() =>
					createRemoteDirectories(serverUrl, token, remoteDir, customHeaders),
				);
				remoteBaseDirExists = true;
				continue;
			} catch (error) {
				if (isRetryableError(error)) {
					await breakableSleep(syncCancel, 5000);
					this.throwIfCancelled();
					remoteBaseDirExists = await this.retryWebDAVCall(() =>
						remoteCollectionExists(serverUrl, token, remoteDir, customHeaders),
					);
					continue;
				}
				throw error;
			}
		}
	}

	private async execTaskGroup(
		run: SyncRunSnapshot,
		tasks: Array<BaseTask>,
		totalDisplayableTasks: Array<BaseTask>,
		allCompletedTasks: Array<BaseTask>,
	) {
		let currentRun = run;
		const tasksToDisplay = tasks.filter((task) => this.isDisplayableTask(task)),
			settledResults = await Promise.allSettled(
				tasks.map(async (task) => {
					const result = await this.executeWithRetry(task);
					if (this.isDisplayableTask(task)) {
						allCompletedTasks.push(task);
						currentRun = updateSyncRunSnapshot(currentRun, {
							progressSummary: this.createProgressSummary(
								totalDisplayableTasks,
								allCompletedTasks,
							),
						});
						syncRun(currentRun);
					}
					return result;
				}),
			),
			results: Array<TaskResult> = settledResults.map((result, index) => {
				if (result.status === 'fulfilled') return result.value;
				const reason = result.reason;
				return {
					error: new TaskError(
						reason instanceof Error ? reason.message : String(reason),
						tasks[index],
						reason instanceof Error ? reason : undefined,
					),
					success: false,
				};
			});

		for (let i = 0; i < tasks.length; ++i) {
			const task = tasks[i],
				taskResult = results[i],
				taskName = getTaskName(task.name);
			if (!taskResult.success)
				logger.warn('Task execution failed', {
					error: taskResult.error,
					index: i + 1,
					localPath: task.localPath,
					remotePath: task.remotePath,
					taskName,
					totalTasks: tasksToDisplay.length,
				});
		}

		return { results, run: currentRun };
	}

	private createProgressSummary(
		totalDisplayableTasks: Array<BaseTask>,
		allCompletedTasks: Array<BaseTask>,
	): SyncProgressSummary {
		return {
			completed: allCompletedTasks.map((task) => ({
				path: task.localPath,
				taskName: task.name ?? 'sync',
			})),
			completedTasks: allCompletedTasks.length,
			totalTasks: totalDisplayableTasks.length,
		};
	}

	private createResultSummary(results: Array<TaskResult>): SyncResultSummary {
		const failed: Array<SyncFailedTaskInfo> = [];

		for (const result of results)
			if (!result.success && result.error) {
				const task = result.error.task;
				failed.push({
					errorMessage: result.error.message,
					localPath: task.options.localPath,
					name: task.name,
				});
			}

		return {
			failed,
			failedTasks: failed.length,
			succeededTasks: results.filter((result) => result.success).length,
			totalTasks: results.length,
		};
	}

	/**
	 * Automatically handle 503 errors and retry task execution
	 */
	private async executeWithRetry(task: BaseTask): Promise<TaskResult> {
		let attempt = 0;
		while (true) {
			if (this.isCancelled)
				return {
					error: new TaskError(t('sync.cancelled'), task),
					success: false,
				};

			const taskResult = await task.exec();
			if (!taskResult.success && isRetryableError(taskResult.error)) {
				attempt++;
				logger.warn('Retrying task after transient error', {
					attempt,
					error: taskResult.error,
					localPath: task.localPath,
					remotePath: task.remotePath,
					taskName: getTaskName(task.name),
				});
				await breakableSleep(syncCancel, 5000);
				if (this.isCancelled)
					return {
						error: new TaskError(t('sync.cancelled'), task),
						success: false,
					};

				continue;
			}
			return taskResult;
		}
	}

	private async retryWebDAVCall<T>(operation: () => Promise<T>) {
		let retryCount = 0;
		while (true) {
			this.throwIfCancelled();

			try {
				return await operation();
			} catch (error) {
				if (!isRetryableError(error)) {
					logger.error('WebDAV operation failed', error);
					throw toError(error, 'WebDAV operation failed');
				}

				retryCount++;
				const retryError = toError(error, 'WebDAV operation failed');
				if (retryCount >= 3) {
					logger.error('WebDAV connection failed after retries', {
						error: retryError,
						retryCount,
					});
					throw new SyncRetryExhaustedError(undefined, retryError);
				}

				logger.warn('Retrying WebDAV operation after transient error', {
					error: retryError,
					retryCount,
				});
				await breakableSleep(syncCancel, 5000);
				this.throwIfCancelled();
			}
		}
	}

	private readonly throwIfCancelled = () => {
		if (!this.isCancelled) return;
		logger.warn('WebDAV operation cancelled');
		throw new SyncCancelledError();
	};

	get app() {
		return this.plugin.app;
	}

	get webdav() {
		return this.options.webdav;
	}

	get vault() {
		return this.options.vault;
	}

	get remoteBaseDir() {
		return this.settings.remoteDir;
	}

	get settings() {
		return this.plugin.settings;
	}

	private getStateKey() {
		return getSyncStateKey({
			account: this.settings.account,
			remoteBaseDir: this.remoteBaseDir,
			serverUrl: this.settings.serverUrl,
			vaultName: this.vault.getName(),
		});
	}
}
