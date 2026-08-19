import type { SyncTrigger } from '~/events';
import type { BaseTask, TaskNames } from '~/sync/tasks/task.interface';

export type SyncPlanKind = 'pull' | 'push' | 'merge' | 'mixed';

export type SyncPlanCounts = {
	download: number;
	merge: number;
	mkdirLocal: number;
	mkdirRemote: number;
	removeLocal: number;
	removeRemote: number;
	upload: number;
};

const INCOMING_TASKS = new Set<TaskNames>(['download', 'createLocalDir']),
	OUTGOING_TASKS = new Set<TaskNames>(['upload', 'createRemoteDir']),
	MERGE_TASKS = new Set<TaskNames>(['merge']),
	REMOVE_LOCAL_TASKS = new Set<TaskNames>(['removeLocal', 'removeLocalRecursively']),
	REMOVE_REMOTE_TASKS = new Set<TaskNames>(['removeRemote', 'removeRemoteRecursively']);

export function shouldConfirmSyncPlan(trigger: SyncTrigger): boolean {
	return trigger === 'manual' || trigger === 'startup';
}

export default function classifySyncPlan(tasks: Array<Pick<BaseTask, 'name'>>): {
	counts: SyncPlanCounts;
	kind: SyncPlanKind;
} {
	const counts: SyncPlanCounts = {
		download: 0,
		merge: 0,
		mkdirLocal: 0,
		mkdirRemote: 0,
		removeLocal: 0,
		removeRemote: 0,
		upload: 0,
	};

	for (const task of tasks)
		switch (task.name) {
			case 'download': {
				counts.download++;
				break;
			}
			case 'upload': {
				counts.upload++;
				break;
			}
			case 'merge': {
				counts.merge++;
				break;
			}
			case 'createLocalDir': {
				counts.mkdirLocal++;
				break;
			}
			case 'createRemoteDir': {
				counts.mkdirRemote++;
				break;
			}
			case 'removeLocal':
			case 'removeLocalRecursively': {
				counts.removeLocal++;
				break;
			}
			case 'removeRemote':
			case 'removeRemoteRecursively': {
				counts.removeRemote++;
				break;
			}
			default: {
				break;
			}
		}

	const hasIncoming = tasks.some((task) => INCOMING_TASKS.has(task.name)),
		hasOutgoing = tasks.some((task) => OUTGOING_TASKS.has(task.name)),
		hasMerge = tasks.some((task) => MERGE_TASKS.has(task.name)),
		hasRemove = tasks.some(
			(task) => REMOVE_LOCAL_TASKS.has(task.name) || REMOVE_REMOTE_TASKS.has(task.name),
		);

	let kind: SyncPlanKind = 'mixed';
	if (hasMerge || (hasIncoming && hasOutgoing)) kind = 'merge';
	else if (hasIncoming && !hasOutgoing && !hasRemove) kind = 'pull';
	else if (hasOutgoing && !hasIncoming && !hasRemove) kind = 'push';

	return { counts, kind };
}
