// src/ui/modals.ts
// Modal dialogs used by the settings tab. Extracted from the main.ts monolith.

import { App, FuzzySuggestModal, getIconIds, Modal, setIcon, TFile } from 'obsidian';
import { t } from '../i18n';

export class FileSuggestModal extends FuzzySuggestModal<TFile> {
    onChoose: (path: string) => void;

    constructor(app: App, onChoose: (path: string) => void) {
        super(app);
        this.onChoose = onChoose;
        this.setPlaceholder(t("modals.fileSuggestPlaceholder"));
    }
    getItems(): TFile[] {
        return this.app.vault.getFiles().filter(f => f.extension === 'base');
    }
    getItemText(file: TFile): string { return file.path; }
    onChooseItem(file: TFile, _evt: MouseEvent | KeyboardEvent) { this.onChoose(file.path); }
}

export class ViewNameSuggestModal extends FuzzySuggestModal<string> {
    viewNames: string[];
    onChoose: (item: string) => void;

    constructor(app: App, viewNames: string[], onChoose: (item: string) => void) {
        super(app);
        this.viewNames = viewNames;
        this.onChoose = onChoose;
        this.setPlaceholder(this.viewNames.length > 0
            ? t("modals.viewSuggestPlaceholder")
            : t("modals.viewSuggestEmpty"));
    }
    getItems(): string[] { return this.viewNames; }
    getItemText(item: string): string { return item; }
    onChooseItem(item: string) { this.onChoose(item); }
}

export class ConfirmModal extends Modal {
    message: string;
    onConfirm: () => void;

    constructor(app: App, message: string, onConfirm: () => void) {
        super(app);
        this.message = message;
        this.onConfirm = onConfirm;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("p", { text: this.message });
        const btnContainer = contentEl.createDiv({ cls: "modal-button-container" });

        const cancelBtn = btnContainer.createEl("button", { text: t("dangerZone.cancelButton") });
        cancelBtn.onclick = () => this.close();

        const confirmBtn = btnContainer.createEl("button", { text: t("dangerZone.confirmButton"), cls: "mod-warning" });
        confirmBtn.onclick = () => { this.onConfirm(); this.close(); };
    }
    onClose() { this.contentEl.empty(); }
}

export class IconSuggestModal extends FuzzySuggestModal<string> {
    onChoose: (item: string) => void;

    constructor(app: App, onChoose: (item: string) => void) {
        super(app);
        this.onChoose = onChoose;
        this.setPlaceholder(t("modals.iconSuggestPlaceholder"));
    }
    getItems(): string[] { return getIconIds(); }
    getItemText(item: string): string { return item; }
    renderSuggestion(match: { item: string }, el: HTMLElement) {
        el.empty();
        el.setCssProps({ display: 'flex', alignItems: 'center' });
        const iconEl = el.createSpan();
        iconEl.setCssProps({ marginRight: '10px', display: 'flex' });
        setIcon(iconEl, match.item);
        el.createSpan({ text: match.item });
    }
    onChooseItem(item: string) { this.onChoose(item); }
}
