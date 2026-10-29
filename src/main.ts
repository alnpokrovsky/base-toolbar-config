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
    WorkspaceLeaf,
    getLanguage
} from 'obsidian';
import { initI18n, t } from './i18n';

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
    hideGroup: boolean;
    hideViews: boolean;
    enableCustomViewStyle: boolean;
}

export interface BvsSettings {
    fileConfigs: Record<string, FileConfig>;
}

interface ParsedBaseFile {
    views: string[];
    hide: string[];
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
    hideGroup: false,
    hideViews: false,
    enableCustomViewStyle: false
};

const DEFAULT_SETTINGS: BvsSettings = {
    fileConfigs: {}
};

// toolbar.hide token → CSS class.
const HIDE_TOKEN_TO_CLASS: Record<string, string> = {
    'search': 'bth-hide-search',
    'filter': 'bth-hide-filter',
    'sort': 'bth-hide-sort',
    'properties': 'bth-hide-properties',
    'group': 'bth-hide-group',
    'views': 'bth-hide-views',
    'result-count': 'bth-hide-result-count',
};

const ALL_HIDE_CLASSES: string[] = [
    'bth-hide-search',
    'bth-hide-filter',
    'bth-hide-sort',
    'bth-hide-properties',
    'bth-hide-group',
    'bth-hide-views',
    'bth-hide-result-count',
];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// ================== PLUGIN ==================

export default class BaseToolbarConfigPlugin extends Plugin {
    settings!: BvsSettings;
    private baseFileCache: Record<string, ParsedBaseFile> = {};
    observer!: MutationObserver;

    async onload() {
        // 1. Get Obsidian's UI language code.
        const obsidianLang = getLanguage();
        // 2. ts-obsidian-i18n reads the language from localStorage.
        window.localStorage.setItem('language', obsidianLang);
        // 3. Initialize i18n.
        initI18n(this.app);

        await this.loadSettings();
        this.addSettingTab(new BaseToolbarConfigSettingTab(this.app, this));

        this.baseFileCache = {};

        // Synchronous MutationObserver: reacts to .bases-toolbar insertion
        // in the same microtask, before the browser paints.
        this.observer = new MutationObserver((mutations) => this.onMutations(mutations));
        this.observer.observe(document.body, { childList: true, subtree: true });

        this.app.workspace.onLayoutReady(() => { void this.processAllViews(); });

        // Immediate processing on file-open (fast path).
        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (!file || file.extension !== 'base') return;
            this.app.workspace.iterateAllLeaves((leaf) => {
                const view: CustomBaseView = leaf.view;
                if (view.file?.path === file.path) {
                    this.injectIntoView(view).catch(e => console.error('injectIntoView failed:', e));
                }
            });
        }));

        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            const view: CustomBaseView | undefined = leaf?.view;
            if (view?.file?.extension === 'base') {
                this.injectIntoView(view).catch(e => console.error('injectIntoView failed:', e));
            }
        }));

        this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
            if (file instanceof TFile && file.extension === 'base') {
                delete this.baseFileCache[oldPath];
                delete this.baseFileCache[file.path];

                const oldConfig = this.settings.fileConfigs[oldPath];
                if (oldConfig) {
                    this.settings.fileConfigs[file.path] = oldConfig;
                    delete this.settings.fileConfigs[oldPath];
                    void this.saveSettings();
                } else {
                    void this.processAllViews();
                }
            }
        }));

        this.registerEvent(this.app.vault.on('modify', (file: TAbstractFile) => {
            if (file instanceof TFile && file.extension === 'base') {
                delete this.baseFileCache[file.path];
                void this.processAllViews();
            }
        }));

        this.registerEvent(this.app.vault.on('delete', (file: TAbstractFile) => {
            if (file instanceof TFile && file.extension === 'base') {
                delete this.baseFileCache[file.path];
            }
        }));
    }

    onunload() {
        if (this.observer) this.observer.disconnect();
        document.querySelectorAll('.bth-view, .bvs-view').forEach(el => {
            el.classList.remove(
                'bth-view', 'bvs-view', 'bvs-custom-view-style',
                ...ALL_HIDE_CLASSES
            );
        });
        document.querySelectorAll('.my-base-btns-container').forEach(el => el.remove());
    }

    // === Mutation handling: react synchronously to toolbar insertion ===

    private onMutations(mutations: MutationRecord[]): void {
        let toolbarInserted = false;

        outer: for (const mutation of mutations) {
            if (mutation.addedNodes.length === 0) continue;
            for (const node of Array.from(mutation.addedNodes)) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.classList.contains('bases-toolbar') || node.querySelector('.bases-toolbar')) {
                    toolbarInserted = true;
                    break outer;
                }
            }
        }

        if (!toolbarInserted) return;

        // Process synchronously. Classes are added in this microtask,
        // before the browser paints.
        this.app.workspace.iterateAllLeaves((leaf) => {
            const view: CustomBaseView = leaf.view;
            if (view.file?.extension === 'base') {
                this.injectIntoView(view).catch(e => console.error('injectIntoView failed:', e));
            }
        });
    }

    async loadSettings() {
        const raw: unknown = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, isRecord(raw) ? raw : {});

        for (const [path, cfg] of Object.entries(this.settings.fileConfigs)) {
            this.settings.fileConfigs[path] = Object.assign(
                {},
                DEFAULT_FILE_CONFIG,
                cfg,
                { buttons: Array.isArray(cfg.buttons) ? cfg.buttons : [] }
            );
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
        document.querySelectorAll('.my-base-btns-container').forEach(el => el.remove());
        this.baseFileCache = {};
        void this.processAllViews();
    }

    async parseBaseFile(filePath: string): Promise<ParsedBaseFile> {
        const cached = this.baseFileCache[filePath];
        if (cached) return cached;

        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
            return { views: [], hide: [] };
        }

        const result: ParsedBaseFile = { views: [], hide: [] };
        try {
            const content = await this.app.vault.cachedRead(file);
            const parsed: unknown = parseYaml(content);
            if (isRecord(parsed)) {
                if (Array.isArray(parsed.views)) {
                    for (const v of parsed.views) {
                        if (isRecord(v) && typeof v.name === 'string') {
                            result.views.push(v.name);
                        }
                    }
                }
                if (isRecord(parsed.toolbar) && Array.isArray(parsed.toolbar.hide)) {
                    for (const item of parsed.toolbar.hide) {
                        if (typeof item === 'string') result.hide.push(item);
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to parse ${filePath}`, e);
        }

        this.baseFileCache[filePath] = result;
        return result;
    }

    async getAvailableViewNamesForFile(filePath: string): Promise<string[]> {
        const parsed = await this.parseBaseFile(filePath);
        return parsed.views;
    }

    async processAllViews() {
        this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
            const view: CustomBaseView = leaf.view;
            if (view.file?.extension === 'base') {
                this.injectIntoView(view).catch(e => console.error('injectIntoView failed:', e));
            }
        });

        await this.processEmbeddedBases();
    }

    private async processEmbeddedBases() {
        const embeds = document.querySelectorAll<HTMLElement>('.internal-embed.bases-embed');
        for (const embed of Array.from(embeds)) {
            const src = embed.getAttribute('src');
            if (!src) continue;

            const filePath = this.resolveEmbedPath(src);
            if (!filePath) continue;

            embed.classList.add('bth-view');
            embed.classList.remove(...ALL_HIDE_CLASSES, 'bvs-custom-view-style');

            const config = this.settings.fileConfigs[filePath];
            if (config) {
                this.applyConfigHideClasses(embed, config);
                embed.classList.toggle('bvs-custom-view-style', config.enableCustomViewStyle);
            }

            const parsed = await this.parseBaseFile(filePath);
            this.hideTokensToClasses(embed, parsed.hide);
        }
    }

    private resolveEmbedPath(src: string): string | null {
        const decoded = decodeURIComponent(src);
        const withoutAnchor = decoded.split('#')[0] ?? decoded;
        const clean = withoutAnchor.split('|')[0] ?? withoutAnchor;

        const direct = this.app.vault.getAbstractFileByPath(clean);
        if (direct instanceof TFile && direct.extension === 'base') return direct.path;

        const baseName = clean.split('/').pop();
        if (!baseName) return null;
        const candidates = this.app.vault.getFiles().filter(f => f.extension === 'base' && f.name === baseName);
        const first = candidates[0];
        return first ? first.path : null;
    }

    private applyConfigHideClasses(el: HTMLElement, config: FileConfig): void {
        el.classList.toggle('bth-hide-search', config.hideSearch);
        el.classList.toggle('bth-hide-filter', config.hideFilter);
        el.classList.toggle('bth-hide-sort', config.hideSort);
        el.classList.toggle('bth-hide-properties', config.hideProperties);
        el.classList.toggle('bth-hide-group', config.hideGroup);
        el.classList.toggle('bth-hide-views', config.hideViews);
        el.classList.toggle('bth-hide-result-count', config.hideResultCount);
    }

    private hideTokensToClasses(el: HTMLElement, tokens: string[]): void {
        // Only adds. Never removes. Preserves classes already set by settings.
        for (const token of tokens) {
            const cls = HIDE_TOKEN_TO_CLASS[token];
            if (cls) el.classList.add(cls);
        }
    }

    async injectIntoView(view: CustomBaseView) {
        if (!view.file) return;

        const filePath = view.file.path;
        const config = this.settings.fileConfigs[filePath];
        const container = view.containerEl;

        // === SYNC: classes applied in the same tick, before paint ===
        container.classList.add('bvs-view', 'bth-view');
        container.classList.remove(...ALL_HIDE_CLASSES, 'bvs-custom-view-style');

        if (config) {
            this.applyConfigHideClasses(container, config);
            container.classList.toggle('bvs-custom-view-style', config.enableCustomViewStyle);
        }

        // === ASYNC: toolbar.hide from YAML (adds on top of settings) ===
        const parsed = await this.parseBaseFile(filePath);
        this.hideTokensToClasses(container, parsed.hide);

        // === Custom view-switcher buttons ===
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
        if (!firstElement) return;
        const parent = firstElement.parentNode;
        if (!(parent instanceof HTMLElement)) return;

        const btnContainer = parent.createDiv({
            cls: 'my-base-btns-container',
            attr: { 'data-bvs-path': filePath }
        });

        let renderList: ButtonConfig[] = [...config.buttons];
        if (config.enableDefault) {
            const defaultBtn: ButtonConfig = { icon: 'home', viewName: config.defaultViewName, isDefault: true, showText: false };
            if (config.defaultPosition === 'left') renderList.unshift(defaultBtn);
            else renderList.push(defaultBtn);
        }

        renderList.forEach(btnConfig => {
            const btn = btnContainer.createDiv({ cls: 'clickable-icon my-base-btn' });
            if (btnConfig.showText) btn.classList.add('bvs-text-mode');
            btn.setAttribute('aria-label', `${btnConfig.viewName}`);
            setIcon(btn, btnConfig.icon || 'layout-grid');
            btn.createSpan({ cls: 'bvs-btn-text', text: btnConfig.viewName });

            btn.onclick = (e: MouseEvent) => {
                e.stopPropagation();
                void this.switchView(view, btnConfig.viewName);
            };
        });

        parent.insertBefore(btnContainer, firstElement.nextSibling);
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

class BaseToolbarConfigSettingTab extends PluginSettingTab {
    plugin: BaseToolbarConfigPlugin;
    currentTab: string | null;
    draggedIndex: number | null;

    constructor(app: App, plugin: BaseToolbarConfigPlugin) {
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

        window.requestAnimationFrame(() => {
            if (scrollContainer) scrollContainer.scrollTop = currentScroll;
            this.containerEl.setCssProps({ minHeight: '' });
        });
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        const items: SettingDefinitionItem[] = [];

        items.push({ name: t("settings.title") });

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
                this.toggleDef(t("interface.hideGroup"), 'hideGroup', null, config),
                this.toggleDef(t("interface.hideViews"), 'hideViews', null, config),
            ]
        });

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

        const nameContainer = el.querySelector<HTMLElement>('.setting-item-name');
        if (nameContainer) {
            const dragIcon = nameContainer.createSpan({ cls: 'bvs-drag-handle' });
            setIcon(dragIcon, 'grip-vertical');
            nameContainer.prepend(dragIcon);
        }

        el.addEventListener('dragstart', (e: DragEvent) => {
            this.draggedIndex = index;
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
            }
            window.setTimeout(() => el.classList.add('is-dragging'), 0);
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
