import type { App } from 'obsidian';
import { Modal, Setting } from 'obsidian';
import type { FileTreeSelectionController } from '~/components/fileTree';
import type RemoveRemoteTask from '~/sync/tasks/remove-remote.task';
import { mount as mountFileTree } from '~/components/fileTree';
import t from '~/i18n';

export default class RemoteDeleteConfirmModal extends Modal {
	private action: 'keep' | 'delete' = 'keep';
	private renderTree?: () => void;
	private selectionController?: FileTreeSelectionController;
	private resolver:
		| ((value: {
				tasksToDelete: Array<RemoveRemoteTask>;
				tasksToDownload: Array<RemoveRemoteTask>;
		  }) => void)
		| undefined;

	constructor(
		app: App,
		private readonly tasks: Array<RemoveRemoteTask>,
	) {
		super(app);
	}

	onOpen() {
		this.setTitle(t('deleteConfirm.remoteTitle'));

		const { contentEl } = this;
		contentEl.empty();

		const instruction = contentEl.createEl('p', {
			cls: 'delete-confirm-instruction',
		});
		instruction.className = 'whitespace-pre-line';
		instruction.setText(t('deleteConfirm.remoteInstruction'));

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
					.setButtonText(t('deleteConfirm.keepRemote'))
					.setCta()
					.onClick(() => {
						this.action = 'keep';
						this.close();
					});
			})
			.addButton((button) => {
				button
					.setButtonText(t('deleteConfirm.remoteDeleteSelected'))
					.setWarning()
					.onClick(() => {
						this.action = 'delete';
						this.close();
					});
			});
	}

	openAndWait(): Promise<{
		tasksToDelete: Array<RemoveRemoteTask>;
		tasksToDownload: Array<RemoveRemoteTask>;
	}> {
		return new Promise((resolve) => {
			this.action = 'keep';
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

		if (this.action !== 'delete') {
			resolver({
				tasksToDelete: [],
				tasksToDownload: this.tasks,
			});
			return;
		}

		resolver({
			tasksToDelete: (selectionSnapshot?.selectedTasks ?? []) as Array<RemoveRemoteTask>,
			tasksToDownload: (selectionSnapshot?.unselectedTasks ?? []) as Array<RemoveRemoteTask>,
		});
	}
}
