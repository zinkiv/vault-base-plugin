import type en from './en';

const zhHant: typeof en = {
	deleteConfirm: {
		deleteAndReupload: '刪除已選項目，重新上傳未勾選項目',
		filePath: '檔案路徑',
		instruction:
			'⚠️ 以下本機檔案將在自動同步時被刪除（因為它們已在遠端被刪除）。\n\n請勾選要刪除的檔案；未勾選的檔案將被重新上傳：',
		keepRemote: '保留遠端檔案',
		remoteDeleteSelected: '刪除已選遠端檔案',
		remoteInstruction:
			'⚠️ 以下遠端檔案將被刪除（因為本機沒有這些檔案）。\n\n如果這是新建的空庫，請選擇保留遠端檔案。刪除後無法從外掛恢復。\n\n請勾選要從伺服器刪除的檔案；未勾選的會下載到本庫：',
		remoteTitle: '確認刪除遠端檔案',
		remoteWarningNotice: '遠端檔案即將被刪除，請確認',
		select: '選擇',
		skipForNow: '暫時跳過',
		title: '確認刪除本機檔案',
		warningNotice: '本機檔案即將被刪除，請確認',
	},
	dirSelector: {
		cancel: '取消',
		confirm: '確認',
		currentPath: '目前路徑：{{path}}',
		goBack: '返回上層',
		newFolder: '新增資料夾',
	},
	errors: {
		filenameUnsupportedChars: '檔案 {{path}} 包含不支援的字元：{{chars}}',
	},
	settings: {
		account: {
			desc: '輸入您的 WebDAV 帳號',
			name: '帳號',
			placeholder: '請輸入帳號',
		},
		checkConnection: {
			desc: '點擊以檢查 WebDAV 連線',
			failure: 'WebDAV 連線失敗',
			failureButton: '失敗 ×',
			failureWithReason: 'WebDAV 連線失敗：{{reason}}',
			name: '檢查連線',
			success: 'WebDAV 連線成功',
			successButton: '已連線 ✓',
		},
		clearRecords: {
			button: '清除同步記錄',
			cleared: '同步記錄已清除',
			desc: 'WebDAV 同步記錄用於追蹤同步狀態，以協調本機與遠端檔案的同步作業。警告：此操作極可能導致資料遺失。',
			name: '清除記錄',
		},
		confirmBeforeDeleteInAutoSync: {
			desc: '在自動同步期間即將刪除本機檔案時顯示確認對話方塊，讓您選擇刪除或重新上傳這些檔案。',
			name: '自動同步前確認刪除檔案',
		},
		conflictStrategy: {
			desc: '選擇解決檔案衝突的方式。\n注意：建議在使用智慧合併前先備份重要檔案，以防止資料遺失。',
			diffMatchPatch: '智慧合併',
			keepLocal: '保留本機版本',
			keepRemote: '保留遠端版本',
			latestTimestamp: '使用最新版本',
			name: '衝突解決策略',
			skip: '跳過衝突',
		},
		credential: {
			desc: '輸入您的 WebDAV 憑證',
			name: '憑證',
			placeholder: '請輸入憑證',
		},
		encryption: {
			desc: '上傳前加密檔案，下載時解密檔案。加密密碼將儲存於 Obsidian 鑰匙圈中。',
			name: '加密',
			reminderModal: {
				acknowledge: '我了解了',
				messageDisabled:
					'⚠️ 停用加密前請務必注意以下事項：\n\n1. 後續所有上傳都將以明文進行，不再加密。\n2. 請確保所有裝置都已停用加密功能。\n3. 若此 Vault 先前曾以加密方式上傳，請完全刪除遠端基底目錄（包含根資料夾），並重新上傳整個 Vault。',
				messageEnabled:
					'⚠️ 啟用加密前請務必注意以下事項：\n\n1. 後續所有上傳都將經過加密處理。\n\n2. 若此 Vault 先前曾以未加密方式上傳，請完全刪除遠端目錄（包含根資料夾），並重新上傳整個 Vault。\n\n3. 請確保所有裝置上的以下四項設定完全一致：\n    • 加密密碼\n    • 伺服器 URL\n    • 帳號名稱\n    • 遠端目錄\n\n4. 加密演算法會將解密金鑰與檔案位置及伺服器身分綁定，這能提供更高的安全性與資料完整性。但這也意味著，若您使用不同的伺服器，或未透過此外掛就將檔案移動到其他位置，將無法解密該檔案。\n\n5. 請避免在伺服器上手動管理檔案。若日後更換伺服器，請在啟用加密的狀態下重新上傳 Vault。\n\n6. 由於加密機制，同步過程所需時間會稍長一些。',
				titleDisabled: '已停用加密',
				titleEnabled: '已啟用加密',
			},
		},
		exhaustiveRemoteTraversal: {
			desc: '在單一 WebDAV 請求中遍歷整個遠端目錄樹，包含所有子目錄。這能大幅縮減大型目錄的遍歷時間，但可能與部分 WebDAV 伺服器存在相容性問題。（此功能會在 PROPFIND 請求中傳送 "Depth: infinity"）',
			name: '完整遠端遍歷',
		},
		fastRealtimeSync: {
			desc: '假設快速同步期間遠端內容不會變更，以便重複使用快取資料並避免不必要的請求。這可以提升同步效能，但會忽略遠端的變更。建議搭配啟動時同步及定期同步使用。',
			name: '即時同步快速模式',
		},
		filters: {
			add: '新增規則',
			cancel: '取消',
			confirmRemove: '確認移除',
			desc: '新增路徑以篩選檔案或資料夾',
			description:
				'符合這些模式的檔案或資料夾將在同步時被忽略。請使用 * 作為萬用字元進行比對。',
			edit: '編輯規則',
			exclude: {
				desc: '符合這些 Glob 模式的檔案／資料夾將不會被同步。若要排除特定檔案，請記得加入副檔名（例如 .md）。',
				name: '排除規則',
			},
			include: {
				desc: '僅同步符合這些 Glob 模式的檔案／資料夾（若有定義）。若要包含特定檔案，請記得加入副檔名（例如 .md）。',
				name: '包含規則',
			},
			name: '同步篩選器',
			placeholder: '例如：.DS_Store, *.pdf',
			remove: '移除',
			save: '儲存',
		},
		invalidValue: '數值無效，已重設為先前的值',
		realtimeSync: {
			desc: '檔案修改後立即自動觸發同步。請在欄位中調整從檔案修改到觸發同步之間的延遲時間。',
			name: '即時同步',
			placeholder: '同步延遲（例如 1s、500ms）',
		},
		remoteDir: {
			desc: '輸入遠端目錄',
			edit: '編輯',
			name: '遠端目錄',
			placeholder: '輸入遠端目錄',
		},
		scheduledSync: {
			desc: '定期觸發背景同步。請在欄位中設定定期背景同步的間隔時間。',
			name: '排程同步',
			placeholder: '輸入間隔（例如 10min、0.5h）',
		},
		sections: {
			common: '一般',
			development: '開發設定',
			filters: '篩選規則',
			service: '服務設定',
		},
		serverUrl: {
			desc: '您的 WebDAV 服務基礎 URL。',
			name: 'WebDAV 伺服器 URL',
			placeholder: 'https://example.com/webdav',
		},
		startupSync: {
			desc: 'Obsidian 載入完成後再自動同步。啟動同步不會刪除遠端檔案。請設定至少數秒的延遲；0 ms 可能在庫尚未就緒時就開始同步。',
			name: '啟動時同步',
			placeholder: '輸入延遲（例如 10s、1min）',
		},
		tips: {
			desc: '⚠️ 同步過程可能會修改或刪除本機檔案。請在同步前備份重要檔案。',
			name: '提示',
		},
		unmergeableStrategy: {
			desc: '針對無法透過智慧合併解決的檔案（所有非 Markdown 檔案），選擇替代處理策略。',
			name: '無法合併時的衝突解決策略',
		},
		useGitStyle: {
			desc: '使用 <<<<<<< 和 >>>>>>> 標記來標示衝突，而非 HTML 標籤',
			name: '使用 Git 風格衝突標記',
		},
	},
	sync: {
		alreadyUpToDate: '✅ 已是最新狀態',
		awaitingConfirmation: '💤 等待確認中',
		cancelled: '⭕ 同步已取消',
		complete: '✅ 同步完成',
		completeWithFailed: '❌ 同步完成，但有 {{failedCount}} 個任務失敗',
		error: {
			accountNotConfigured:
				'尚未設定 WebDAV 帳號。請先在設定中配置伺服器 URL、帳號名稱及憑證。',
			conflictsMarkedInFile: '偵測到衝突並已在檔案中标示',
			failedToAutoMerge: '自動合併失敗',
			failedToUploadMerged: '上傳合併後的內容失敗',
			folderButFile: '預期為資料夾但發現檔案：{{path}}',
			localPathNotFound: '找不到本機路徑：{{path}}',
			notFound: '找不到：{{path}}',
		},
		failedStatus: '❌ 同步失敗',
		failedWithError: '❌ 同步失敗，錯誤訊息：{{error}}',
		fileFolderConflict: {
			file: '檔案',
			folder: '資料夾',
			message: '無法同步：{{path}} 在遠端是{{remoteForm}}，但在本機卻是{{localForm}}',
		},
		fileOp: {
			addRecord: '新增記錄',
			cleanRecord: '清除記錄',
			createLocalDir: '建立本機目錄',
			createRemoteDir: '建立遠端目錄',
			download: '下載',
			merge: '合併',
			removeLocal: '移除本機項目',
			removeLocalRecursively: '遞迴移除本機項目',
			removeRemote: '移除遠端項目',
			removeRemoteRecursively: '遞迴移除遠端項目',
			sync: '同步',
			upload: '上傳',
		},
		preConnecting: '☎️ 預先連線中',
		progress: '⌛️ 同步進度：{{percent}}%',
		remoteDirectoryEmpty: '遠端目錄為空。如果筆記在其他資料夾，請在設定中選擇正確的遠端目錄。',
		runKind: {
			fast: '快速',
			normal: '標準',
		},
		startButton: '開始同步',
		stopButton: '停止同步',
		syncingFiles: '⌛️ 正在同步檔案...',
		walkingRemote: '🔍 正在掃描遠端目錄',
	},
	time: {
		daysAgo: '{{count}} 天前',
		hoursAgo: '{{count}} 小時前',
		justNow: '剛剛',
		longAgo: '很久以前',
		minutesAgo: '{{count}} 分鐘前',
	},
};

export default zhHant;
