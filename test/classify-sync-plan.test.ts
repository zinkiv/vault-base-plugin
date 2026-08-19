import { expect, test } from 'bun:test';
import classifySyncPlan, { shouldConfirmSyncPlan } from '~/sync/utils/classify-sync-plan';

test('empty client and populated remote is a pull plan', () => {
	expect(
		classifySyncPlan([{ name: 'createLocalDir' }, { name: 'download' }, { name: 'download' }])
			.kind,
	).toBe('pull');
});

test('populated client and empty remote is a push plan', () => {
	expect(
		classifySyncPlan([{ name: 'createRemoteDir' }, { name: 'upload' }, { name: 'upload' }])
			.kind,
	).toBe('push');
});

test('both sides with files is a merge plan', () => {
	expect(classifySyncPlan([{ name: 'merge' }, { name: 'upload' }]).kind).toBe('merge');
	expect(classifySyncPlan([{ name: 'download' }, { name: 'upload' }]).kind).toBe('merge');
});

test('delete tasks without a two-way transfer are mixed', () => {
	expect(classifySyncPlan([{ name: 'removeRemote' }, { name: 'download' }]).kind).toBe('mixed');
});

test('manual and startup sync ask for plan confirmation', () => {
	expect(shouldConfirmSyncPlan('manual')).toBe(true);
	expect(shouldConfirmSyncPlan('startup')).toBe(true);
	expect(shouldConfirmSyncPlan('interval')).toBe(false);
	expect(shouldConfirmSyncPlan('realtime')).toBe(false);
});
