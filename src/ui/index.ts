// src/ui/index.ts
// BaseToolbarConfigSettingTab — the plugin's settings UI.
// Extracted from the main.ts monolith. All i18n keys and rendered output are
// preserved exactly; only the module boundary changed.

import { App, PluginSettingTab, setIcon, Setting, SettingDefinitionItem, SettingGroupItem } from 'obsidian';
import { t } from '../i18n';
import { BaseToolbarConfigPlugin } from '../main';
import { ButtonConfig, DEFAULT_FILE_CONFIG, FileConfig } from '../utils/settings';
import {
    FileSuggestModal,
    ViewNameSuggestModal,
    ConfirmModal,
    IconSuggestModal,
} from './modals';

export class BaseToolbarConfigSettingTab extends PluginSettingTab {
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

                filePaths.forEach((path) => {
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
                this.toggleDef(t("interface.enableCustomViewStyle.name"), 'enableCustomViewStyle', t("interface.enableCustomViewStyle.desc"), config, true),
                this.toggleDef(t("interface.hideResultCount"), 'hideResultCount', null, config, false),
                this.toggleDef(t("interface.hideSearch"), 'hideSearch', null, config, false),
                this.toggleDef(t("interface.hideProperties"), 'hideProperties', null, config, false),
                this.toggleDef(t("interface.hideFilter"), 'hideFilter', null, config, false),
                this.toggleDef(t("interface.hideSort"), 'hideSort', null, config, false),
                this.toggleDef(t("interface.hideGroup"), 'hideGroup', null, config, false),
                this.toggleDef(t("interface.hideViews"), 'hideViews', null, config, false),
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

    toggleDef(
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

    buildButtonRow(setting: Setting, btnConfig: ButtonConfig, index: number, config: FileConfig) {
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

        const rowEl = el;

        this.plugin.registerDomEvent(rowEl, 'dragstart', (e: DragEvent) => {
            this.draggedIndex = index;
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
            }
            window.setTimeout(() => rowEl.classList.add('is-dragging'), 0);
        });

        this.plugin.registerDomEvent(rowEl, 'dragover', (e: DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }

            const bounding = rowEl.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) {
                rowEl.classList.add('drag-over-bottom');
                rowEl.classList.remove('drag-over-top');
            } else {
                rowEl.classList.add('drag-over-top');
                rowEl.classList.remove('drag-over-bottom');
            }
        });

        this.plugin.registerDomEvent(rowEl, 'dragleave', () => {
            rowEl.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        this.plugin.registerDomEvent(rowEl, 'drop', (e: DragEvent) => {
            e.preventDefault();
            rowEl.classList.remove('drag-over-top', 'drag-over-bottom');

            if (this.draggedIndex === null) return;

            // Recompute target index from DOM position rather than trusting the
            // closure-captured index.
            const rows = Array.from(rowEl.parentElement?.querySelectorAll<HTMLElement>('.bvs-draggable-item') ?? []);
            let targetIndex = rows.indexOf(rowEl);

            if (this.draggedIndex === targetIndex) {
                this.draggedIndex = null;
                return;
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

        this.plugin.registerDomEvent(rowEl, 'dragend', () => {
            rowEl.classList.remove('is-dragging');
            this.containerEl.querySelectorAll('.bvs-draggable-item').forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            this.draggedIndex = null;
        });
    }
}
