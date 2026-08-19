import { expect, test } from 'bun:test';
import shouldKeepRemoteOnAutoSync from '~/sync/utils/keep-remote-on-auto';

test('manual sync can still delete remote files after confirmation', () => {
	expect(shouldKeepRemoteOnAutoSync('manual', 0)).toBe(false);
	expect(shouldKeepRemoteOnAutoSync('manual', 4)).toBe(false);
});

test('startup sync never deletes remote files', () => {
	expect(shouldKeepRemoteOnAutoSync('startup', 0)).toBe(true);
	expect(shouldKeepRemoteOnAutoSync('startup', 4)).toBe(true);
});

test('other auto sync keeps remote files when the local vault is empty', () => {
	expect(shouldKeepRemoteOnAutoSync('interval', 0)).toBe(true);
	expect(shouldKeepRemoteOnAutoSync('realtime', 0)).toBe(true);
	expect(shouldKeepRemoteOnAutoSync('interval', 2)).toBe(false);
	expect(shouldKeepRemoteOnAutoSync('realtime', 2)).toBe(false);
});
