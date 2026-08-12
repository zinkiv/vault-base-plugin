import { expect, mock, test } from 'bun:test';

const getDirectoryContentsMock = mock(() =>
	Promise.resolve([] as Array<{ isDir: boolean; path: string }>),
);

void mock.module('~/fs/webdav/api', () => ({
	createRemoteDirectories: mock(() => Promise.resolve()),
	getDirectoryContents: getDirectoryContentsMock,
	getStat: mock(() => Promise.resolve({} as never)),
	isWebDavNotFoundError: (error: unknown) => {
		if (!error || typeof error !== 'object') return false;
		const err = error as { message?: string; res?: { status?: number } };
		if (err.res?.status === 404) return true;
		return typeof err.message === 'string' && /^404\s*:/.test(err.message);
	},
	remoteCollectionExists: mock(() => Promise.resolve(true)),
}));

const { traverseWebDAV } = await import('~/fs/webdav');

test('uses remote-base-aware path when traversing child directories', async () => {
	getDirectoryContentsMock.mockReset();
	getDirectoryContentsMock.mockResolvedValueOnce([{ isDir: true, path: '/test/vault-base/' }]);
	getDirectoryContentsMock.mockResolvedValueOnce([]);

	await traverseWebDAV({ token: 'token' });

	expect(getDirectoryContentsMock).toHaveBeenNthCalledWith(
		1,
		'https://dav.example.com/dav',
		'token',
		'/test/',
		false,
		undefined,
	);
	expect(getDirectoryContentsMock).toHaveBeenNthCalledWith(
		2,
		'https://dav.example.com/dav',
		'token',
		'/test/vault-base/',
		false,
		undefined,
	);
});

test('skips missing directories during traversal', async () => {
	getDirectoryContentsMock.mockReset();
	getDirectoryContentsMock.mockResolvedValueOnce([{ isDir: true, path: '/test/missing/' }]);
	getDirectoryContentsMock.mockRejectedValueOnce({
		message: '404: Not Found',
		res: { status: 404 },
	});

	await traverseWebDAV({ token: 'token' });

	expect(getDirectoryContentsMock).toHaveBeenNthCalledWith(
		2,
		'https://dav.example.com/dav',
		'token',
		'/test/missing/',
		false,
		undefined,
	);
});

test('does not treat a missing remote base directory as an empty listing', async () => {
	getDirectoryContentsMock.mockReset();
	getDirectoryContentsMock.mockRejectedValueOnce({
		message: '404: WebDAV path not found: /test/',
		res: { status: 404 },
	});

	try {
		await traverseWebDAV({ token: 'token' });
		throw new Error('expected traverseWebDAV to throw');
	} catch (error) {
		expect(error).toMatchObject({ res: { status: 404 } });
	}
});
