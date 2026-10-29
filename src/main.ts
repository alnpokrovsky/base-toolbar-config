// src/main.ts
import {
    App,
    FuzzySuggestModal,
    getIconIds,
    Modal,
    Notice,
    parseYaml,
    Plugin,
    PluginSettingTab,
    Setting,
    SettingDefinitionItem,
    SettingGroupItem,
    setIcon,
    TAbstractFile,
    TFile,
    View,
    WorkspaceLeaf
} from 'obsidian';
import { t } from './i18n';

// ================== INTERFACES ==================

export interface ButtonConfig {
    icon: string;
    viewName: string;
    showText: boolean;
    isDefault?: boolean;
}

export interface FileConfig {
    buttons: ButtonConfig[];
    enableDefault: boolean;
    defaultPosition: 'left' | 'right';
    defaultViewName: string;
    hideResultCount: boolean;
    hideSearch: boolean;
    hideProperties: boolean;
    hideFilter: boolean;
    hideSort: boolean;
    enableCustomViewStyle: boolean;
}

export interface BvsSettings {
    fileConfigs: Record<string, FileConfig>;
}

type CustomBaseView = View & { file?: TFile };

// ================== CONSTANTS & DEFAULTS ==================

const DEFAULT_FILE_CONFIG: FileConfig = {
    buttons: [],
    enableDefault: false,
    defaultPosition: 'left',
    defaultViewName: 'Main view',
    hideResultCount: true,
    hideSearch: false,
    hideProperties: false,
    hideFilter: false,
    hideSort: false,
    enableCustomViewStyle: false
};

const DEFAULT_SETTINGS: BvsSettings = {
    fileConfigs: {}
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    return function (this: unknown, ...args: Parameters<T>) {
        if (timeout !== null) window.clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), wait);
    };
}

// ================== PLUGIN ==================

export default class BasesToolbarCleanerPlugin extends Plugin {
    settings!: BvsSettings;
    viewNameCache: Record<string, string[]> = {};
    observer!: MutationObserver;
    debouncedProcessAllViews!: () => void;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new BasesToolbarCleanerSettingTab(this.app, this));

        this.viewNameCache = {};

        this.debouncedProcessAllViews = debounce(this.processAllViews.bind(this), 250);
        this.observer = new MutationObserver(() => this.debouncedProcessAllViews());
        this.observer.observe(document.body, { childList: true, subtree: true });

        this.app.workspace.onLayoutReady(() => this.processAllViews());

        this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
            if (file instanceof TFile && file.extension === 'base' && this.settings.fileConfigs[oldPath]) {
                this.settings.fileConfigs[file.path] = this.settings.fileConfigs[oldPath];
                delete this.settings.fileConfigs[oldPath];
                void this.saveSettings();
            }
        }));
    }

    onunload() {
        if (this.observer) this.observer.disconnect();
        document.querySelectorAll('.bth-view, .bvs-view').forEach(el => {
            el.classList.remove(
                'bth-view', 'bvs-view',
                'bth-hide-result-count', 'bth-hide-search',
                'bth-hide-properties', 'bth-hide-filter', 'bth-hide-sort',
                'bvs-hide-result-count', 'bvs-hide-search',
                'bvs-hide-properties', 'bvs-hide-filter', 'bvs-hide-sort',
                'bvs-custom-view-style'
            );
        });
        document.querySelectorAll('.my-base-btns-container').forEach(el => el.remove());
    }

    async loadSettings() {
        const stored = (await this.loadData()) as Partial<BvsSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        document.querySelectorAll('.my-base-btns-container').forEach(el => el.remove());
        this.processAllViews();
    }

    async getAvailableViewNamesForFile(filePath: string): Promise<string[]> {
        if (this.viewNameCache[filePath]) return this.viewNameCache[filePath];

        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file || !(file instanceof TFile)) return [];

        const names = new Set<string>();
        try {
            const content = await this.app.vault.cachedRead(file);
            const parsed = parseYaml(content) as unknown;
            if (isRecord(parsed) && Array.isArray(parsed.views)) {
                for (const v of parsed.views) {
                    if (isRecord(v) && typeof v.name === 'string') {
                        names.add(v.name);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to parse YAML", e);
        }

        this.viewNameCache[filePath] = Array.from(names);
        return this.viewNameCache[filePath];
    }

    processAllViews() {
        this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
            const view = leaf.view as CustomBaseView;
            if (view && view.file && view.file.extension === 'base') {
                this.injectIntoView(view);
            }
        });

        document
            .querySelectorAll('.internal-embed[src$=".base"], .cm-embed-block')
            .forEach(el => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.querySelector('.bases-toolbar, .bases-view')) {
                    this.applyToolbarClasses(htmlEl);
                }
            });
    }

    private applyToolbarClasses(container: HTMLElement) {
        container.classList.add('bth-view');
        container.classList.remove(
            'bth-hide-result-count', 'bth-hide-search', 'bth-hide-properties',
            'bth-hide-filter', 'bth-hide-sort'
        );

        const src = container.getAttribute('src');
        const config = src ? this.settings.fileConfigs[src] : undefined;

        const s = config || {
            hideResultCount: true,
            hideSearch: false,
            hideProperties: false,
            hideFilter: false,
            hideSort: false,
        };

        container.classList.toggle('bth-hide-result-count', s.hideResultCount);
        container.classList.toggle('bth-hide-search', s.hideSearch);
        container.classList.toggle('bth-hide-properties', s.hideProperties);
        container.classList.toggle('bth-hide-filter', s.hideFilter);
        container.classList.toggle('bth-hide-sort', s.hideSort);
    }

    injectIntoView(view: CustomBaseView) {
        if (!view.file) return;

        const filePath = view.file.path;
        const config = this.settings.fileConfigs[filePath];
        const container = view.containerEl;

        container.classList.add('bvs-view');
        container.classList.remove(
            'bvs-hide-result-count', 'bvs-hide-search', 'bvs-hide-properties',
            'bvs-hide-filter', 'bvs-hide-sort', 'bvs-custom-view-style',
            'bth-hide-result-count', 'bth-hide-search', 'bth-hide-properties',
            'bth-hide-filter', 'bth-hide-sort'
        );

        if (config) {
            container.classList.toggle('bth-hide-result-count', config.hideResultCount);
            container.classList.toggle('bth-hide-search', config.hideSearch);
            container.classList.toggle('bth-hide-properties', config.hideProperties);
            container.classList.toggle('bth-hide-filter', config.hideFilter);
            container.classList.toggle('bth-hide-sort', config.hideSort);
        }

        container.classList.toggle('bvs-hide-result-count', config?.hideResultCount ?? false);
        container.classList.toggle('bvs-hide-search', config?.hideSearch ?? false);
        container.classList.toggle('bvs-hide-properties', config?.hideProperties ?? false);
        container.classList.toggle('bvs-hide-filter', config?.hideFilter ?? false);
        container.classList.toggle('bvs-hide-sort', config?.hideSort ?? false);
        container.classList.toggle('bvs-custom-view-style', config?.enableCustomViewStyle ?? false);

        const toolbar = container.querySelector('.bases-toolbar');
        if (!toolbar) return;

        const existingBtnContainer = toolbar.querySelector<HTMLElement>('.my-base-btns-container');
        if (existingBtnContainer) {
            if (existingBtnContainer.getAttribute('data-bvs-path') === filePath) {
                return;
            } else {
                existingBtnContainer.remove();
            }
        }

        if (!config) return;

        const firstElement = toolbar.firstElementChild;
        if (!firstElement || !firstElement.parentNode) return;

        const btnContainer = document.createElement('div');
        btnContainer.className = 'my-base-btns-container';
        btnContainer.setAttribute('data-bvs-path', filePath);

        let renderList: ButtonConfig[] = [...config.buttons];
        if (config.enableDefault) {
            const defaultBtn: ButtonConfig = { icon: 'home', viewName: config.defaultViewName, isDefault: true, showText: false };
            if (config.defaultPosition === 'left') renderList.unshift(defaultBtn);
            else renderList.push(defaultBtn);
        }

        renderList.forEach(btnConfig => {
            const btn = document.createElement('div');
            btn.className = 'clickable-icon my-base-btn';

            if (btnConfig.showText) {
                btn.classList.add('bvs-text-mode');
            }

            btn.setAttribute('aria-label', `${btnConfig.viewName}`);
            setIcon(btn, btnConfig.icon || 'layout-grid');

            const textSpan = document.createElement('span');
            textSpan.className = 'bvs-btn-text';
            textSpan.innerText = btnConfig.viewName;
            btn.appendChild(textSpan);

            btn.onclick = (e: MouseEvent) => {
                e.stopPropagation();
                void this.switchView(view, btnConfig.viewName);
            };
            btnContainer.appendChild(btn);
        });

        firstElement.parentNode.insertBefore(btnContainer, firstElement.nextSibling);
    }

    async switchView(targetView: CustomBaseView, targetViewName: string) {
        try {
            if (targetView && typeof targetView.getState === 'function' && typeof targetView.setState === 'function') {
                const state = targetView.getState();
                if (state) {
                    state.viewName = targetViewName;
                    await targetView.setState(state, { history: true });
                } else {
                    new Notice(t("notices.switchFailed"));
                }
            } else {
                new Notice(t("notices.switchFailed"));
            }
        } catch (error) {
            console.error("Base View Switcher error:", error);
        }
    }
}

// ================== MODALS ==================

class FileSuggestModal extends FuzzySuggestModal<TFile> {
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

class ViewNameSuggestModal extends FuzzySuggestModal<string> {
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

class ConfirmModal extends Modal {
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

class IconSuggestModal extends FuzzySuggestModal<string> {
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

// ================== SETTINGS UI ==================

class BasesToolbarCleanerSettingTab extends PluginSettingTab {
    plugin: BasesToolbarCleanerPlugin;
    currentTab: string | null;
    draggedIndex: number | null;

    constructor(app: App, plugin: BasesToolbarCleanerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.currentTab = null;
        this.draggedIndex = null;
    }

    refreshUI() {
        const scrollContainer = this.containerEl.closest('.vertical-tab-content') || this.containerEl.parentElement;
        const currentScroll = scrollContainer ? scrollContainer.scrollTop : 0;

        const currentHeight = this.containerEl.clientHeight;
        if (currentHeight > 0) {
            this.containerEl.setCssProps({ minHeight: `${currentHeight}px` });
        }

        this.update();

        requestAnimationFrame(() => {
            if (scrollContainer) scrollContainer.scrollTop = currentScroll;
            this.containerEl.setCssProps({ minHeight: '' });
        });
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        const items: SettingDefinitionItem[] = [];

        items.push({ name: t("settings.title") });

        // File tabs strip (custom render row)
        items.push({
            name: '',
            render: (setting) => {
                setting.settingEl.empty();
                const tabsContainer = setting.settingEl.createDiv('bvs-settings-tabs-container');

                const filePaths = Object.keys(this.plugin.settings.fileConfigs);
                if (filePaths.length > 0 && !this.currentTab) {
                    this.currentTab = filePaths[0] ?? null;
                } else if (filePaths.length === 0) {
                    this.currentTab = null;
                }

                filePaths.forEach(path => {
                    const fileName = path.split('/').pop()?.replace('.base', '') || path;
                    const tabEl = tabsContainer.createDiv('bvs-settings-tab');
                    tabEl.setText(fileName);
                    if (path === this.currentTab) tabEl.classList.add('is-active');
                    tabEl.onclick = () => { this.currentTab = path; this.refreshUI(); };
                });

                const addTabEl = tabsContainer.createDiv('bvs-settings-tab bvs-settings-tab-add');
                addTabEl.setText(t("tabs.addDatabase"));
                addTabEl.onclick = () => {
                    new FileSuggestModal(this.app, (selectedPath: string) => {
                        if (!this.plugin.settings.fileConfigs[selectedPath]) {
                            this.plugin.settings.fileConfigs[selectedPath] = {
                                ...DEFAULT_FILE_CONFIG,
                                buttons: DEFAULT_FILE_CONFIG.buttons.map(b => ({ ...b })),
                            };
                        }
                        this.currentTab = selectedPath;
                        void (async () => {
                            await this.plugin.saveSettings();
                            this.refreshUI();
                        })();
                    }).open();
                };
            }
        });

        if (!this.currentTab) {
            items.push({ name: t("tabs.emptyState") });
            return items;
        }

        const config = this.plugin.settings.fileConfigs[this.currentTab];
        if (!config) {
            items.push({ name: t("tabs.emptyState") });
            return items;
        }

        const tabName = this.currentTab.split('/').pop() || this.currentTab;

        // ---- Interface group ----
        items.push({
            type: 'group',
            heading: t("interface.title", { name: tabName }),
            items: [
                this.toggleDef(t("interface.enableCustomViewStyle.name"), 'enableCustomViewStyle', t("interface.enableCustomViewStyle.desc"), config),
                this.toggleDef(t("interface.hideResultCount"), 'hideResultCount', null, config),
                this.toggleDef(t("interface.hideSearch"), 'hideSearch', null, config),
                this.toggleDef(t("interface.hideProperties"), 'hideProperties', null, config),
                this.toggleDef(t("interface.hideFilter"), 'hideFilter', null, config),
                this.toggleDef(t("interface.hideSort"), 'hideSort', null, config),
            ]
        });

        // ---- Default button group ----
        const defaultItems: SettingGroupItem[] = [
            this.toggleDef(t("defaultButton.enable"), 'enableDefault', null, config, true),
        ];

        if (config.enableDefault) {
            defaultItems.push({
                name: t("defaultButton.position"),
                render: (setting) => {
                    setting.addDropdown(drop => drop
                        .addOption('left', t("defaultButton.positionLeft"))
                        .addOption('right', t("defaultButton.positionRight"))
                        .setValue(config.defaultPosition)
                        .onChange((v: string) => {
                            config.defaultPosition = v === 'right' ? 'right' : 'left';
                            void this.plugin.saveSettings();
                        }));
                }
            });

            defaultItems.push({
                name: t("defaultButton.selectView"),
                render: (setting) => {
                    setting.addButton(btn => btn
                        .setButtonText(config.defaultViewName || t("defaultButton.selectView"))
                        .onClick(() => {
                            void (async () => {
                                const views = await this.plugin.getAvailableViewNamesForFile(this.currentTab!);
                                new ViewNameSuggestModal(this.app, views, (v: string) => {
                                    config.defaultViewName = v;
                                    void (async () => {
                                        await this.plugin.saveSettings();
                                        btn.setButtonText(v);
                                    })();
                                }).open();
                            })();
                        }));
                }
            });
        }

        items.push({
            type: 'group',
            heading: t("defaultButton.title"),
            items: defaultItems
        });

        // ---- Custom buttons group ----
        const customItems: SettingGroupItem[] = [
            {
                name: t("customButtons.addNew"),
                render: (setting) => {
                    setting.addButton(btn => btn
                        .setButtonText(t("customButtons.addButton"))
                        .setCta()
                        .onClick(() => {
                            config.buttons.push({ icon: 'layout-list', viewName: 'Select view', showText: false });
                            void (async () => {
                                await this.plugin.saveSettings();
                                this.refreshUI();
                            })();
                        }));
                }
            }
        ];

        config.buttons.forEach((btnConfig, index) => {
            customItems.push({
                name: t("customButtons.buttonLabel", { index: index + 1 }),
                render: (setting) => {
                    this.buildButtonRow(setting, btnConfig, index, config);
                }
            });
        });

        items.push({
            type: 'group',
            heading: t("customButtons.title"),
            items: customItems
        });

        // ---- Danger zone ----
        items.push({
            type: 'group',
            heading: t("dangerZone.title"),
            items: [
                {
                    name: t("dangerZone.desc"),
                    render: (setting) => {
                        setting.addButton(btn => btn
                            .setButtonText(t("dangerZone.deleteButton"))
                            .setDestructive()
                            .onClick(() => {
                                new ConfirmModal(this.app, t("dangerZone.confirmMessage", { path: this.currentTab ?? '' }), () => {
                                    delete this.plugin.settings.fileConfigs[this.currentTab!];
                                    this.currentTab = null;
                                    void (async () => {
                                        await this.plugin.saveSettings();
                                        this.refreshUI();
                                    })();
                                }).open();
                            }));
                    }
                }
            ]
        });

        return items;
    }

    // ---- Helpers that produce SettingGroupItem ----

    private toggleDef(
        name: string,
        key: keyof FileConfig,
        desc: string | null,
        config: FileConfig,
        refresh = false
    ): SettingGroupItem {
        return {
            name,
            desc: desc ?? undefined,
            render: (setting) => {
                setting.addToggle(toggle => toggle
                    .setValue(config[key] as boolean)
                    .onChange((value) => {
                        (config[key] as boolean) = value;
                        void (async () => {
                            await this.plugin.saveSettings();
                            if (refresh) this.refreshUI();
                        })();
                    }));
            }
        };
    }

    private buildButtonRow(setting: Setting, btnConfig: ButtonConfig, index: number, config: FileConfig) {
        setting.addButton(btn => {
            btn.setIcon(btnConfig.icon || 'star');
            btn.setTooltip(t("customButtons.changeIcon"));
            btn.onClick(() => {
                new IconSuggestModal(this.app, (selectedIcon: string) => {
                    btnConfig.icon = selectedIcon;
                    void (async () => {
                        await this.plugin.saveSettings();
                        btn.setIcon(selectedIcon);
                    })();
                }).open();
            });
        });

        setting.addButton(btn => {
            btn.setButtonText(btnConfig.viewName || 'Select view');
            btn.setTooltip(t("customButtons.bindView"));
            btn.onClick(() => {
                void (async () => {
                    const views = await this.plugin.getAvailableViewNamesForFile(this.currentTab!);
                    new ViewNameSuggestModal(this.app, views, (selectedView: string) => {
                        btnConfig.viewName = selectedView;
                        void (async () => {
                            await this.plugin.saveSettings();
                            btn.setButtonText(selectedView);
                        })();
                    }).open();
                })();
            });
        });

        setting.addButton(btn => {
            btn.setIcon(btnConfig.showText ? 'eye-off' : 'eye');
            btn.setTooltip(btnConfig.showText ? t("customButtons.showAsText") : t("customButtons.showAsIcon"));
            btn.onClick(() => {
                btnConfig.showText = !btnConfig.showText;
                btn.setIcon(btnConfig.showText ? 'eye-off' : 'eye');
                btn.setTooltip(btnConfig.showText ? t("customButtons.showAsText") : t("customButtons.showAsIcon"));
                void this.plugin.saveSettings();
            });
        });

        setting.addButton(btn => btn
            .setIcon('trash')
            .setTooltip(t("customButtons.delete"))
            .onClick(() => {
                config.buttons.splice(index, 1);
                void (async () => {
                    await this.plugin.saveSettings();
                    this.refreshUI();
                })();
            }));

        const el = setting.settingEl;
        el.draggable = true;
        el.classList.add('bvs-draggable-item');

        const nameContainer = el.querySelector('.setting-item-name');
        if (nameContainer) {
            const dragIcon = document.createElement('span');
            dragIcon.className = 'bvs-drag-handle';
            setIcon(dragIcon, 'grip-vertical');
            nameContainer.prepend(dragIcon);
        }

        el.addEventListener('dragstart', (e: DragEvent) => {
            this.draggedIndex = index;
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
            }
            setTimeout(() => el.classList.add('is-dragging'), 0);
        });

        el.addEventListener('dragover', (e: DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }

            const bounding = el.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) {
                el.classList.add('drag-over-bottom');
                el.classList.remove('drag-over-top');
            } else {
                el.classList.add('drag-over-top');
                el.classList.remove('drag-over-bottom');
            }
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        el.addEventListener('drop', (e: DragEvent) => {
            e.preventDefault();
            el.classList.remove('drag-over-top', 'drag-over-bottom');

            if (this.draggedIndex === null || this.draggedIndex === index) return;

            const bounding = el.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            let targetIndex = index;
            if (e.clientY - offset > 0) {
                targetIndex = index + 1;
            }

            if (this.draggedIndex < targetIndex) {
                targetIndex--;
            }

            const [movedItem] = config.buttons.splice(this.draggedIndex, 1);
            if (movedItem) {
                config.buttons.splice(targetIndex, 0, movedItem);
            }

            this.draggedIndex = null;
            void (async () => {
                await this.plugin.saveSettings();
                this.refreshUI();
            })();
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('is-dragging');
            this.draggedIndex = null;
            this.containerEl.querySelectorAll('.bvs-draggable-item').forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });
    }
}
