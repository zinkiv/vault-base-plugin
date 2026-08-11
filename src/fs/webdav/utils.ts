import type { WebDAVClient } from 'webdav';
import type { BinaryLike } from '~/platform/binary';
import { toArrayBuffer } from '~/platform/binary';
import { usePlugin } from '~/settings';
import { createRemoteDirectories, getStat } from './api';

export async function statItem(path: string, statPath = path) {
	const plugin = await usePlugin();
	return Object.assign(
		await getStat(
			plugin.settings.serverUrl,
			plugin.getToken(),
			path,
			plugin.settings.customHeaders,
		),
		{ path: statPath },
	);
}

export async function getContent(webdav: WebDAVClient, path: string) {
	if (path.endsWith('/')) throw new Error(`Cannot read a folder as a file: ${path}`);
	const content = (await webdav.getFileContents(path)) as BinaryLike;
	return toArrayBuffer(content);
}

export async function mkdirsWebDAV(_client: WebDAVClient, path: string) {
	const plugin = await usePlugin();
	await createRemoteDirectories(
		plugin.settings.serverUrl,
		plugin.getToken(),
		path,
		plugin.settings.customHeaders,
	);
}
