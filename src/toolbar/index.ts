// src/toolbar/index.ts
// DOM-level toolbar processing: leaf view injection, embedded base processing,
// view switching, and hide-class application. Operates on plugin-owned state
// (settings, baseFileCache) passed through the plugin instance.

import { App, Notice, setIcon, TFile, View, WorkspaceLeaf } from 'obsidian';
import { t } from '../i18n';
import { BaseToolbarConfigPlugin } from '../main';
import { FileConfig } from '../utils/settings';
import { parseBaseFile } from '../utils/yaml';
import { ALL_HIDE_CLASSES, HIDE_TOKEN_TO_CLASS } from './classes';

type CustomBaseView = View & { file?: TFile };

// Serializes concurrent injectIntoView() calls keyed by file path so the
// shared baseFileCache is never written by two overlapping ticks.
const inflight = new Map<string, Promise<void>>();

export function applyConfigHideClasses(el: HTMLElement, config: FileConfig): void {
    el.classList.toggle('bth-hide-search', config.hideSearch);
    el.classList.toggle('bth-hide-filter', config.hideFilter);
    el.classList.toggle('bth-hide-sort', config.hideSort);
    el.classList.toggle('bth-hide-properties', config.hideProperties);
    el.classList.toggle('bth-hide-group', config.hideGroup);
    el.classList.toggle('bth-hide-views', config.hideViews);
    el.classList.toggle('bth-hide-result-count', config.hideResultCount);
}

export function hideTokensToClasses(el: HTMLElement, tokens: string[]): void {
    // Only adds. Never removes. Preserves classes set by settings above.
    for (const token of tokens) {
        const cls = HIDE_TOKEN_TO_CLASS[token];
        if (cls) el.classList.add(cls);
    }
}

// Resolve an embed's `src` to an actual .base file path.
// Handles anchors (`file.base#view`), aliases (`file.base|text`),
// URL-encoding, and relative/basename-only paths. Relative paths are resolved
// against the active file's source path (the embed's containing note cannot be
// reliably determined from the DOM alone, so the active file is the best
// available approximation).
export function resolveEmbedPath(app: App, src: string): string | null {
    let clean = src.split('#')[0] ?? src;
    clean = clean.split('|')[0] ?? clean;
    clean = decodeURIComponent(clean);
    clean = clean.replace(/^vault:\/\//, '').replace(/^app:\/\//, '');

    // 1. Exact vault path — fastest, no enumeration.
    const direct = app.vault.getAbstractFileByPath(clean);
    if (direct instanceof TFile && direct.extension === 'base') return direct.path;

    // 2. Obsidian's link resolver — handles basename-only paths and relative
    //    paths from the active file. Uses the metadata cache, not a vault scan.
    const sourcePath = app.workspace.getActiveFile()?.path ?? '';
    const resolved = app.metadataCache.getFirstLinkpathDest(clean, sourcePath);
    if (resolved instanceof TFile && resolved.extension === 'base') return resolved.path;

    return null;
}

async function injectIntoViewCore(plugin: BaseToolbarConfigPlugin, view: CustomBaseView): Promise<void> {
    if (!view.file) return;

    const filePath = view.file.path;
    const config = plugin.settings.fileConfigs[filePath];
    const container = view.containerEl;

    // === SYNC: classes applied in the same tick, before paint ===
    container.classList.add('bvs-view', 'bth-view');
    container.classList.remove(...ALL_HIDE_CLASSES, 'bvs-custom-view-style');

    if (config) {
        applyConfigHideClasses(container, config);
        container.classList.toggle('bvs-custom-view-style', config.enableCustomViewStyle);
    }

    // === ASYNC: toolbar.hide from YAML (adds on top of settings) ===
    const parsed = await parseBaseFile(plugin.app.vault, plugin.baseFileCache, filePath);
    hideTokensToClasses(container, parsed.hide);

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

    const parent = firstElement.parentElement;
    if (!parent) return;

    const btnContainer = parent.createDiv({
        cls: 'my-base-btns-container',
        attr: { 'data-bvs-path': filePath },
    });

    let renderList: { icon: string; viewName: string; showText: boolean; isDefault?: boolean }[] = [...config.buttons];
    if (config.enableDefault) {
        const defaultBtn = { icon: 'home', viewName: config.defaultViewName, isDefault: true, showText: false };
        if (config.defaultPosition === 'left') renderList.unshift(defaultBtn);
        else renderList.push(defaultBtn);
    }

    renderList.forEach((btnConfig) => {
        const btn = btnContainer.createDiv({ cls: 'clickable-icon my-base-btn' });
        if (btnConfig.showText) btn.classList.add('bvs-text-mode');
        btn.setAttribute('aria-label', `${btnConfig.viewName}`);
        setIcon(btn, btnConfig.icon || 'layout-grid');
        btn.createSpan({ cls: 'bvs-btn-text', text: btnConfig.viewName });

        btn.onclick = (e: MouseEvent) => {
            e.stopPropagation();
            void switchView(view, btnConfig.viewName);
        };
    });

    parent.insertBefore(btnContainer, firstElement.nextSibling);
}

export async function injectIntoView(plugin: BaseToolbarConfigPlugin, view: CustomBaseView): Promise<void> {
    if (!view.file) return;
    const filePath = view.file.path;

    const existing = inflight.get(filePath);
    if (existing) return existing;

    const promise = injectIntoViewCore(plugin, view).finally(() => inflight.delete(filePath));
    inflight.set(filePath, promise);
    return promise;
}

export async function processAllViews(plugin: BaseToolbarConfigPlugin): Promise<void> {
    // 1) Leaf views — serialized via injectIntoView's in-flight map so
    //    concurrent calls on the same .base file never race on the cache.
    const promises: Promise<void>[] = [];
    plugin.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
        const view: CustomBaseView = leaf.view;
        if (view.file?.extension === 'base') {
            promises.push(injectIntoView(plugin, view));
        }
    });
    await Promise.all(promises);

    // 2) Embedded bases — awaited so we can sequence after YAML reads.
    await processEmbeddedBases(plugin);
}

export async function processEmbeddedBases(plugin: BaseToolbarConfigPlugin): Promise<void> {
    // `[src*=".base"]` matches even when src contains an anchor
    // (`today-planer.base#Рабочие задачи`) or alias (`file.base|text`).
    // `.bases-embed` catches canonical embeds whose src was rewritten.
    const candidates = document.querySelectorAll<HTMLElement>(
        '.internal-embed.bases-embed, .internal-embed[src*=".base"]'
    );

    for (const embed of Array.from(candidates)) {
        // Skip embeds nested inside another embed we already process.
        if (embed.parentElement?.closest('.internal-embed.bases-embed')) continue;

        const src =
            embed.getAttribute('src') ??
            embed.getAttribute('data-path') ??
            embed.getAttribute('data-href');

        if (!src) continue;

        const filePath = resolveEmbedPath(plugin.app, src);
        if (!filePath) continue;

        // Synchronous part: apply config-based hide-classes in the same
        // tick. This is what makes toggle-driven hiding instant.
        embed.classList.add('bth-view');
        embed.classList.remove(...ALL_HIDE_CLASSES, 'bvs-custom-view-style');

        const config = plugin.settings.fileConfigs[filePath];
        if (config) {
            applyConfigHideClasses(embed, config);
            embed.classList.toggle('bvs-custom-view-style', config.enableCustomViewStyle);
        }

        // Async part: YAML-driven `toolbar.hide` (cached after first read).
        const parsed = await parseBaseFile(plugin.app.vault, plugin.baseFileCache, filePath);
        hideTokensToClasses(embed, parsed.hide);
    }
}

export async function switchView(targetView: CustomBaseView, targetViewName: string): Promise<void> {
    if (!targetViewName) {
        new Notice(t('notices.switchFailed'));
        return;
    }

    try {
        if (targetView && typeof targetView.getState === 'function' && typeof targetView.setState === 'function') {
            const state = targetView.getState();
            if (state) {
                state.viewName = targetViewName;
                await targetView.setState(state, { history: true });
            } else {
                new Notice(t('notices.switchFailed'));
            }
        } else {
            new Notice(t('notices.switchFailed'));
        }
    } catch (error) {
        console.error("Base View Switcher error:", error);
    }
}
