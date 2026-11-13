// src/main.ts
// Plugin entry point — lifecycle ONLY. All feature logic is delegated to
// separate modules per AGENTS.md convention.

import { Plugin, TAbstractFile, TFile } from 'obsidian';
import { BvsSettings, mergeSettings, ButtonConfig, FileConfig } from './utils/settings';
import { registerCommands } from './commands';
import { BaseToolbarConfigSettingTab } from './ui';
import { processAllViews } from './toolbar';
import { ToolbarObserver } from './toolbar/observer';
import { ALL_HIDE_CLASSES } from './toolbar/classes';

export { BaseToolbarConfigPlugin };
export type { ButtonConfig, FileConfig, BvsSettings };

interface ParsedBaseFile {
    views: string[];
    hide: string[];
}

export default class BaseToolbarConfigPlugin extends Plugin {
    settings!: BvsSettings;
    baseFileCache: Record<string, ParsedBaseFile> = {};
    private observer = new ToolbarObserver(this);

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new BaseToolbarConfigSettingTab(this.app, this));

        registerCommands(this);

        this.baseFileCache = {};

        this.observer.connect();

        this.app.workspace.onLayoutReady(() => { void this.processAllViews(); });

        this.registerEvent(this.app.workspace.on('file-open', () => {
            void this.processAllViews();
        }));

        this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
            void this.processAllViews();
        }));

        this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
            if (!(file instanceof TFile) || file.extension !== 'base') return;

            // Only evict the OLD path — deleting the NEW path here would force
            // an unnecessary re-read on the very next render.
            delete this.baseFileCache[oldPath];

            const oldConfig = this.settings.fileConfigs[oldPath];
            if (oldConfig) {
                this.settings.fileConfigs[file.path] = oldConfig;
                delete this.settings.fileConfigs[oldPath];
                void this.saveSettings();
            } else {
                void this.processAllViews();
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
        this.observer.disconnect();
        document.querySelectorAll('.bth-view, .bvs-view').forEach(el => {
            el.classList.remove(
                'bth-view', 'bvs-view', 'bvs-custom-view-style',
                ...ALL_HIDE_CLASSES
            );
        });
        document.querySelectorAll('.my-base-btns-container').forEach(el => el.remove());
    }

    async loadSettings() {
        const raw: unknown = await this.loadData();
        this.settings = mergeSettings(raw ?? {});
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Only refresh affected UI, don't wipe the entire cache + re-scan all
        // leaves on every toggle. Settings persistence is decoupled from view
        // processing; callers that need a refresh call processAllViews().
    }

    async getAvailableViewNamesForFile(filePath: string): Promise<string[]> {
        const { parseBaseFile } = await import('./utils/yaml');
        const parsed = await parseBaseFile(this.app.vault, this.baseFileCache, filePath);
        return parsed.views;
    }

    async processAllViews(): Promise<void> {
        return processAllViews(this);
    }
}
