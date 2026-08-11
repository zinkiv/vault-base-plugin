import type { ToggleNumericSettingsField } from '~/types';
import { chunk, zipMerge } from '~/utils/fns';
import type { BaseTask } from '../tasks/task.interface';
import MkdirLocalTask from '../tasks/mkdir-local.task';
import MkdirRemoteTask from '../tasks/mkdir-remote.task';
import PullTask from '../tasks/pull.task';
import PushTask from '../tasks/push.task';
import RemoveLocalTask from '../tasks/remove-local.task';
import RemoveRemoteTask from '../tasks/remove-remote.task';
import limitPushPullTasks from './limit-push-pull-tasks';
import mergeRemoveTasks from './merge-remove-tasks';
import sortMkdirTasks from './sort-mkdir-tasks';

export default function optimizeTasks(
	tasks: Array<BaseTask>,
	chunking: ToggleNumericSettingsField,
	throughput: ToggleNumericSettingsField,
): Array<Array<BaseTask>> {
	const uniqueTasks = [...new Set(tasks)],
		mkdirLocalTasks: Array<MkdirLocalTask> = [],
		mkdirRemoteTasks: Array<MkdirRemoteTask> = [],
		removeLocalTasks: Array<RemoveLocalTask> = [],
		removeRemoteTasks: Array<RemoveRemoteTask> = [],
		pushPullTasks: Array<PushTask | PullTask> = [],
		otherTasks: Array<BaseTask> = [];

	for (const task of uniqueTasks)
		if (task instanceof MkdirLocalTask) mkdirLocalTasks.push(task);
		else if (task instanceof MkdirRemoteTask) mkdirRemoteTasks.push(task);
		else if (task instanceof RemoveLocalTask) removeLocalTasks.push(task);
		else if (task instanceof RemoveRemoteTask) removeRemoteTasks.push(task);
		else if (task instanceof PushTask || task instanceof PullTask) pushPullTasks.push(task);
		else otherTasks.push(task);

	return [
		...chunkOrNot(
			[
				...mergeRemoveTasks(removeRemoteTasks, 'remote'),
				...mergeRemoveTasks(removeLocalTasks, 'local'),
				...otherTasks,
			],
			chunking,
		),
		...zipMerge<BaseTask>(
			sortMkdirTasks(mkdirLocalTasks),
			sortMkdirTasks(mkdirRemoteTasks),
		).flatMap((dirTasks) => chunkOrNot(dirTasks, chunking)),
		...limitPushPullTasks(pushPullTasks, chunking, throughput),
	].filter((organizedTasks) => organizedTasks.length > 0);
}

function chunkOrNot<A>(arr: Array<A>, chunkOption: ToggleNumericSettingsField): Array<Array<A>> {
	return chunkOption.enabled ? chunk(arr, chunkOption.value) : [arr];
}
