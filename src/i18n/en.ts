const en = {
	deleteConfirm: {
		deleteAndReupload: 'Delete selected, re-upload unchecked',
		filePath: 'File path',
		instruction:
			'⚠️ The following local files will be deleted during auto-sync (because they were deleted remotely).\n\nCheck files to delete; unchecked files will be re-uploaded:',
		select: 'Select',
		skipForNow: 'Skip for now',
		title: 'Confirm local file deletion',
		warningNotice: 'Local files will be deleted, please confirm',
		keepRemote: 'Keep remote files',
		remoteDeleteSelected: 'Delete selected remote files',
		remoteInstruction:
			'⚠️ The following remote files will be deleted because they are missing locally.\n\nIf this is a new empty vault, keep the remote files. Deleting them cannot be undone.\n\nChecked files will be deleted on the server; unchecked files will be downloaded to this vault:',
		remoteTitle: 'Confirm remote file deletion',
		remoteWarningNotice: 'Remote files will be deleted, please confirm',
	},
	dirSelector: {
		cancel: 'Cancel',
		confirm: 'Confirm',
		currentPath: 'Current path: {{path}}',
		goBack: 'Go back',
		newFolder: 'New folder',
	},
	errors: {
		filenameUnsupportedChars: 'File {{path}} contains unsupported characters: {{chars}}',
	},
	settings: {
		account: {
			desc: 'Enter your WebDAV account',
			name: 'Account',
			placeholder: 'Enter your account',
		},
		checkConnection: {
			desc: 'Click to check WebDAV connection',
			failure: 'WebDAV connection failed',
			failureButton: 'Failed ×',
			failureWithReason: 'WebDAV connection failed: {{reason}}',
			name: 'Check connection',
			success: 'WebDAV connection successful',
			successButton: 'Connected ✓',
		},
		clearRecords: {
			button: 'Clear sync records',
			cleared: 'Sync records cleared',
			desc: 'WebDAV sync records are used to coordinate sync between local and remote files. Warning: this can cause data loss.',
			name: 'Clear records',
		},
		confirmBeforeDeleteInAutoSync: {
			desc: 'Show a confirmation dialog when local files are about to be deleted during auto-sync, allowing you to choose to delete or re-upload them.',
			name: 'Confirm before deleting files during auto-sync',
		},
		conflictStrategy: {
			desc: 'Choose how to resolve file conflicts. \nNote: we recommend backing up important files before using auto-merge to prevent data loss.',
			diffMatchPatch: 'Smart merge',
			keepLocal: 'Keep local version',
			keepRemote: 'Keep remote version',
			latestTimestamp: 'Use latest version',
			name: 'Conflict resolution strategy',
			skip: 'Skip conflicts',
		},
		credential: {
			desc: 'Enter your WebDAV credential',
			name: 'Credential',
			placeholder: 'Enter your credential',
		},
		encryption: {
			desc: 'Encrypt files before upload and decrypt files when download. Encryption password will be stored in Obsidian keychain.',
			name: 'Encryption',
			reminderModal: {
				acknowledge: 'I understand',
				messageDisabled:
					'⚠️ You should be cautious about following points before disabling encryption:\n\n1. All subsequent uploads will be in plaintext without encryption.\n2. Please ensure all devices have encryption disabled.\n3. If this vault was previously uploaded with encryption, delete the remote base directory entirely including the root folder, and re-upload the vault.',
				messageEnabled:
					"⚠️ You should be cautious about following points before enabling encryption:\n\n1. All subsequent uploads will be encrypted.\n\n2. If this vault was previously uploaded without encryption, delete the remote directory entirely including the root folder, and re-upload the entire vault.\n\n3. You should ensure all the four items are identical on all your devices:\n    • encryption password\n    • server URL\n    • account name\n    • remote directory\n\n4. The encryption algorithm binds the decryption key to the file location and server identity, this provides much better security and data integrity. But it also means that if you use a different server or moving a file to a different location without using this plugin, you won't be able to decrypt it.\n\n5. Please avoid managing files manually on the server. If you change a server later, please re-upload the vault with encryption enabled.\n\n6. Due to the encryption, the sync process will take slightly longer to complete.",
				titleDisabled: 'Encryption disabled',
				titleEnabled: 'Encryption enabled',
			},
		},
		exhaustiveRemoteTraversal: {
			desc: 'Traverse the entire remote directory tree within one WebDAV request, including all subdirectories. This could drastically reduce traversal time for large directories, but may have compatibility issues with some WebDAV servers. (This is to send "Depth: infinity" in PROPFIND request)',
			name: 'Exhaustive remote traversal',
		},
		fastRealtimeSync: {
			desc: "Assume remote content doesn't change during a fast sync to reuse cached data and avoid unnecessary requests. This can improve sync performance but ignores remote changes. Recommend to use with startup sync periodic sync",
			name: 'Fast mode for real-time sync',
		},
		filters: {
			add: 'Add rule',
			cancel: 'Cancel',
			confirmRemove: 'Confirm remove',
			desc: 'Add paths to filter files or folders',
			description:
				'Files or folders matching these patterns will be ignored during sync. Use * for wildcard matching.',
			edit: 'Edit rules',
			exclude: {
				desc: 'Files/folders matching these glob patterns will not be synced. Please remember to add file extensions (for example, .md) if you want to exclude files.',
				name: 'Exclusion rules',
			},
			include: {
				desc: 'Files/folders matching these glob patterns will be synced (if defined). Please remember to add file extensions (for example, .md) if you want to include files.',
				name: 'Inclusion rules',
			},
			name: 'Sync filters',
			placeholder: 'E.g.: .DS_Store, *.pdf',
			remove: 'Remove',
			save: 'Save',
		},
		invalidValue: 'Invalid value, reset to the previous value',
		realtimeSync: {
			desc: 'Trigger syncs automatically as soon as files are modified. Alter the delay between a file being modified and the sync being triggered in the field.',
			name: 'Real-time sync',
			placeholder: 'Sync delay (e.g. 1s, 500ms)',
		},
		remoteDir: {
			desc: 'Enter the remote directory',
			edit: 'Edit',
			name: 'Remote directory',
			placeholder: 'Enter the remote directory',
		},
		scheduledSync: {
			desc: 'Periodically trigger background synchronization. Set the interval for periodic background sync in the field.',
			name: 'Scheduled sync',
			placeholder: 'Enter delay (e.g. 10min, 0.5h)',
		},
		sections: {
			common: 'General',
			development: 'Development settings',
			filters: 'Filter rules',
			service: 'Service configuration',
		},
		serverUrl: {
			desc: 'Base URL of your WebDAV service.',
			name: 'WebDAV server URL',
			placeholder: 'https://example.com/webdav',
		},
		startupSync: {
			desc: 'Automatically trigger a sync after startup. Set the delay after startup to automatically perform a sync in the field.',
			name: 'Startup sync',
			placeholder: 'Enter delay (e.g. 10s, 1min)',
		},
		tips: {
			desc: '⚠️ Sync process will modify or delete local files. Please backup important files before syncing.',
			name: 'Tips',
		},
		unmergeableStrategy: {
			desc: 'Choose the alternative strategy for files that are not resolvable by smart merge (all non-markdown files).',
			name: 'Unmergeable conflict resolution strategy',
		},
		useGitStyle: {
			desc: 'Use  <<<<<<< and  >>>>>>> markers for conflicts instead of HTML tags',
			name: 'Use Git-style conflict markers',
		},
	},
	sync: {
		alreadyUpToDate: '✅ Already up to date',
		awaitingConfirmation: '💤 Waiting for confirmation',
		cancelled: '⭕ Sync cancelled',
		complete: '✅ Sync completed',
		completeWithFailed: '❌ Sync completed with {{failedCount}} failed tasks',
		error: {
			accountNotConfigured:
				'WebDAV account is not configured. Please configure your server URL, account name, and credential in settings first.',
			conflictsMarkedInFile: 'Conflicts found and marked in file',
			failedToAutoMerge: 'Failed to auto merge',
			failedToUploadMerged: 'Failed to upload merged content',
			folderButFile: 'Expected folder but found file: {{path}}',
			localPathNotFound: 'Local path not found: {{path}}',
			notFound: 'Not found: {{path}}',
		},
		failedStatus: '❌ Sync failed',
		failedWithError: '❌ Sync failed with error: {{error}}',
		fileFolderConflict: {
			file: 'file',
			folder: 'folder',
			message:
				'Unable to sync: {{path}} is a {{remoteForm}} at remote but a {{localForm}} at local',
		},
		fileOp: {
			addRecord: 'Add Record',
			cleanRecord: 'Clean record',
			createLocalDir: 'Create local directory',
			createRemoteDir: 'Create remote directory',
			download: 'Download',
			merge: 'Merge',
			removeLocal: 'Remove local',
			removeLocalRecursively: 'Remove local recursively',
			removeRemote: 'Remove remote',
			removeRemoteRecursively: 'Remove remote recursively',
			sync: 'Sync',
			upload: 'Upload',
		},
		preConnecting: '☎️ Pre-connecting',
		progress: '⌛️ Sync progress: {{percent}}%',
		runKind: {
			fast: 'Fast',
			normal: 'Normal',
		},
		startButton: 'Start sync',
		stopButton: 'Stop sync',
		syncingFiles: '⌛️ Syncing files...',
		walkingRemote: '🔍 Walking remote',
	},
	time: {
		daysAgo: '{{count}}d ago',
		hoursAgo: '{{count}}h ago',
		justNow: 'Just now',
		longAgo: 'Long ago',
		minutesAgo: '{{count}}min ago',
	},
};

export default en;
