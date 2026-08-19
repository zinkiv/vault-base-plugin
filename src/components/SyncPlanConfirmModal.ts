import type { App } from 'obsidian';
import { Modal, Setting } from 'obsidian';
import type { FileTreeSelectionController } from '~/components/fileTree';
import type { BaseTask } from '~/sync/tasks/task.interface';
import type { SyncPlanKind } from '~/sync/utils/classify-sync-plan';
import { mount as mountFileTree } from '~/components/fileTree';
import t from '~/i18n';
import classifySyncPlan from '~/sync/utils/classify-sync-plan';

export default class SyncPlanConfirmModal extends Modal {
	private confirmed = false;
	private renderTree?: () => void;
	private selectionController?: FileTreeSelectionController;
	private resolver:
		| ((value: { confirmed: boolean; selectedTasks: Array<BaseTask> }) => void)
		| undefined;

	constructor(
		app: App,
		private readonly tasks: Array<BaseTask>,
	) {
		super(app);
	}

	onOpen() {
		this.modalEl.addClass('vault-base-sync-plan-modal');
		this.setTitle(t('sync.planConfirm.title'));

		const { contentEl } = this,
			{ counts, kind } = classifySyncPlan(this.tasks);
		contentEl.empty();

		const instruction = contentEl.createEl('p', {
			cls: 'delete-confirm-instruction',
		});
		instruction.className = 'whitespace-pre-line';
		instruction.setText(instructionForKind(kind));

		const summaryParts: Array<string> = [];
		if (counts.download > 0)
			summaryParts.push(`${t('sync.fileOp.download')} ${counts.download}`);
		if (counts.upload > 0) summaryParts.push(`${t('sync.fileOp.upload')} ${counts.upload}`);
		if (counts.merge > 0) summaryParts.push(`${t('sync.fileOp.merge')} ${counts.merge}`);
		if (counts.mkdirLocal > 0)
			summaryParts.push(`${t('sync.fileOp.createLocalDir')} ${counts.mkdirLocal}`);
		if (counts.mkdirRemote > 0)
			summaryParts.push(`${t('sync.fileOp.createRemoteDir')} ${counts.mkdirRemote}`);
		if (counts.removeLocal > 0)
			summaryParts.push(`${t('sync.fileOp.removeLocal')} ${counts.removeLocal}`);
		if (counts.removeRemote > 0)
			summaryParts.push(`${t('sync.fileOp.removeRemote')} ${counts.removeRemote}`);
		if (summaryParts.length > 0)
			contentEl.createEl('p', {
				cls: 'vault-base-sync-plan-summary',
				text: summaryParts.join(' · '),
			});

		const treeContainer = contentEl.createDiv({
			cls: 'vault-base-delete-confirm-tree mb-3',
		});
		this.renderTree = mountFileTree(treeContainer, {
			controllerRef: (controller) => {
				this.selectionController = controller;
			},
			tasks: this.tasks,
		});

		new Setting(contentEl)
			.addButton((button) => {
				button
					.setButtonText(t('sync.planConfirm.confirm'))
					.setCta()
					.onClick(() => {
						this.confirmed = true;
						this.close();
					});
			})
			.addButton((button) => {
				button.setButtonText(t('sync.planConfirm.cancel')).onClick(() => {
					this.confirmed = false;
					this.close();
				});
			});
	}

	openAndWait(): Promise<{ confirmed: boolean; selectedTasks: Array<BaseTask> }> {
		return new Promise((resolve) => {
			this.confirmed = false;
			this.resolver = resolve;
			this.open();
		});
	}

	onClose() {
		const selectionSnapshot = this.selectionController?.getSnapshot();
		this.selectionController = undefined;
		this.renderTree?.();
		this.renderTree = undefined;
		this.contentEl.empty();

		const resolver = this.resolver;
		this.resolver = undefined;
		if (!resolver) return;

		resolver({
			confirmed: this.confirmed,
			selectedTasks: this.confirmed ? (selectionSnapshot?.selectedTasks ?? []) : [],
		});
	}
}

function instructionForKind(kind: SyncPlanKind): string {
	if (kind === 'pull') return t('sync.planConfirm.pullInstruction');
	if (kind === 'push') return t('sync.planConfirm.pushInstruction');
	if (kind === 'merge') return t('sync.planConfirm.mergeInstruction');
	return t('sync.planConfirm.mixedInstruction');
}
