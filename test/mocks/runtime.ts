export const ConflictStrategy = {
	DiffMatchPatch: 'diffMatchPatch',
	KeepLocal: 'keepLocal',
	KeepRemote: 'keepRemote',
	LatestTimeStamp: 'latestTimestamp',
	Skip: 'skip',
};

export const UnmergeableStrategy = {
	KeepLocal: 'keepLocal',
	KeepRemote: 'keepRemote',
	LatestTimeStamp: 'latestTimestamp',
	Skip: 'skip',
};

const settings = {
	ConflictStrategy,
	UnmergeableStrategy,
	usePlugin: async () =>
		({
			getToken: () => 'token',
			settings: {
				serverUrl: 'https://dav.example.com/dav',
			},
		}) as never,
	useSettings: async () => ({
		encryption: { enabled: false },
		exhaustiveRemoteTraversal: false,
		filterRules: { exclusionRules: [], inclusionRules: [] },
		maxThroughputConcurrency: { enabled: false, value: 0 },
		remoteDir: '/test/',
		serverUrl: 'https://dav.example.com/dav',
		skipLargeFiles: { enabled: false, value: 0 },
		useGitStyle: false,
	}),
};

export default settings;
