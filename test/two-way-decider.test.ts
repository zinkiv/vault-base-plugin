import { expect, test } from 'bun:test';
import type { TaskFactory } from '~/sync/decision/sync-decision.interface';
import type {
	FileStatModel,
	FolderStatModel,
	RecordStatModel,
	RecordStatsMap,
	StatsMap,
	StatModel,
} from '~/types';
import { ConflictStrategy, UnmergeableStrategy } from '~/settings';
import twoWayDecider from '~/sync/decision/two-way.decider.function';

function fileStat(path: string, mtime = 1): FileStatModel {
	return { isDir: false, mtime, path, size: 4 };
}

function folderStat(path: string): FolderStatModel {
	return { isDir: true, path };
}

function stubFactory() {
	const created: Array<{ path: string; type: string }> = [],
		task = (type: string) => (options: { localPath?: string }) => {
			created.push({ path: options.localPath ?? '', type });
			return { name: type, options } as never;
		},
		factory = {
			createAddRecordTask: task('addRecord'),
			createCleanRecordTask: task('cleanRecord'),
			createMergeTask: task('merge'),
			createMkdirLocalTask: task('mkdirLocal'),
			createMkdirRemoteTask: task('mkdirRemote'),
			createPullTask: task('download'),
			createPushTask: task('upload'),
			createRemoveLocalTask: task('removeLocal'),
			createRemoveRemoteTask: task('removeRemote'),
		} as TaskFactory;
	return { created, factory };
}

test('re-uploads local files when the remote tree has no files left', () => {
	const local: StatsMap = new Map([['note.md', fileStat('note.md')]]),
		remote: StatsMap = new Map(),
		records: RecordStatsMap = new Map([
			['note.md', { local: fileStat('note.md'), remote: fileStat('/test/note.md') }],
		]),
		{ created, factory } = stubFactory();

	twoWayDecider({
		currentLocalStats: local,
		currentRemoteStats: remote,
		records,
		remoteBaseDir: '/test/',
		settings: {
			conflictStrategy: ConflictStrategy.KeepLocal,
			unmergeableStrategy: UnmergeableStrategy.KeepLocal,
		},
		taskFactory: factory,
	});

	expect(created).toStrictEqual([{ path: 'note.md', type: 'upload' }]);
});

test('pulls remote files when the local vault has no recorded files', () => {
	const local: StatsMap = new Map(),
		remote: StatsMap = new Map([['note.md', fileStat('/test/note.md')]]),
		records: RecordStatsMap = new Map([
			['note.md', { local: fileStat('note.md'), remote: fileStat('/test/note.md') }],
		]),
		{ created, factory } = stubFactory();

	twoWayDecider({
		currentLocalStats: local,
		currentRemoteStats: remote,
		records,
		remoteBaseDir: '/test/',
		settings: {
			conflictStrategy: ConflictStrategy.KeepLocal,
			unmergeableStrategy: UnmergeableStrategy.KeepLocal,
		},
		taskFactory: factory,
	});

	expect(created).toStrictEqual([{ path: 'note.md', type: 'download' }]);
});

test('pulls remote files when local only has unrecorded files', () => {
	const local: StatsMap = new Map([['Welcome.md', fileStat('Welcome.md')]]),
		remote: StatsMap = new Map([['note.md', fileStat('/test/note.md')]]),
		records: RecordStatsMap = new Map([
			['note.md', { local: fileStat('note.md'), remote: fileStat('/test/note.md') }],
		]),
		{ created, factory } = stubFactory();

	twoWayDecider({
		currentLocalStats: local,
		currentRemoteStats: remote,
		records,
		remoteBaseDir: '/test/',
		settings: {
			conflictStrategy: ConflictStrategy.KeepLocal,
			unmergeableStrategy: UnmergeableStrategy.KeepLocal,
		},
		taskFactory: factory,
	});

	expect(created).toContainEqual({ path: 'note.md', type: 'download' });
	expect(created).toContainEqual({ path: 'Welcome.md', type: 'upload' });
	expect(created).not.toContainEqual({ path: 'note.md', type: 'removeRemote' });
});

test('still removes a remote file when other recorded local files remain', () => {
	const local: StatsMap = new Map([['keep.md', fileStat('keep.md')]]),
		remote: StatsMap = new Map([
			['keep.md', fileStat('/test/keep.md')],
			['gone.md', fileStat('/test/gone.md')],
		]),
		records: RecordStatsMap = new Map([
			['keep.md', { local: fileStat('keep.md'), remote: fileStat('/test/keep.md') }],
			['gone.md', { local: fileStat('gone.md'), remote: fileStat('/test/gone.md') }],
		]),
		{ created, factory } = stubFactory();

	twoWayDecider({
		currentLocalStats: local,
		currentRemoteStats: remote,
		records,
		remoteBaseDir: '/test/',
		settings: {
			conflictStrategy: ConflictStrategy.KeepLocal,
			unmergeableStrategy: UnmergeableStrategy.KeepLocal,
		},
		taskFactory: factory,
	});

	expect(created).toContainEqual({ path: 'gone.md', type: 'removeRemote' });
	expect(created).not.toContainEqual({ path: 'gone.md', type: 'download' });
});

test('still removes a local file when other remote files remain', () => {
	const local: StatsMap = new Map([
			['keep.md', fileStat('keep.md')],
			['gone.md', fileStat('gone.md')],
		]),
		remote: StatsMap = new Map([['keep.md', fileStat('/test/keep.md')]]),
		records: RecordStatsMap = new Map([
			['keep.md', { local: fileStat('keep.md'), remote: fileStat('/test/keep.md') }],
			['gone.md', { local: fileStat('gone.md'), remote: fileStat('/test/gone.md') }],
		]),
		{ created, factory } = stubFactory();

	twoWayDecider({
		currentLocalStats: local,
		currentRemoteStats: remote,
		records,
		remoteBaseDir: '/test/',
		settings: {
			conflictStrategy: ConflictStrategy.KeepLocal,
			unmergeableStrategy: UnmergeableStrategy.KeepLocal,
		},
		taskFactory: factory,
	});

	expect(created).toContainEqual({ path: 'gone.md', type: 'removeLocal' });
	expect(created).not.toContainEqual({ path: 'gone.md', type: 'upload' });
});

test('recreates local folders instead of deleting remote when local has no recorded files', () => {
	const local: StatsMap = new Map(),
		remote: StatsMap = new Map<string, StatModel>([
			['notes', folderStat('/test/notes')],
			['notes/a.md', fileStat('/test/notes/a.md')],
		]),
		records: RecordStatsMap = new Map<string, RecordStatModel>([
			['notes', { local: folderStat('notes'), remote: folderStat('/test/notes') }],
			['notes/a.md', { local: fileStat('notes/a.md'), remote: fileStat('/test/notes/a.md') }],
		]),
		{ created, factory } = stubFactory();

	twoWayDecider({
		currentLocalStats: local,
		currentRemoteStats: remote,
		records,
		remoteBaseDir: '/test/',
		settings: {
			conflictStrategy: ConflictStrategy.KeepLocal,
			unmergeableStrategy: UnmergeableStrategy.KeepLocal,
		},
		taskFactory: factory,
	});

	expect(created).toContainEqual({ path: 'notes', type: 'mkdirLocal' });
	expect(created).toContainEqual({ path: 'notes/a.md', type: 'download' });
	expect(created).not.toContainEqual({ path: 'notes', type: 'removeRemote' });
	expect(created).not.toContainEqual({ path: 'notes/a.md', type: 'removeRemote' });
});
