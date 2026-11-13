// src/toolbar/observer.ts
// Debounced MutationObserver that only re-processes when a `.bases-toolbar`
// actually gets inserted into the DOM.

import { BaseToolbarConfigPlugin } from '../main';

export class ToolbarObserver {
    private observer: MutationObserver | null = null;
    private pending = false;
    private lastRun = 0;
    private readonly debounceMs: number;

    constructor(
        private readonly plugin: BaseToolbarConfigPlugin,
        debounceMs = 75,
    ) {
        this.debounceMs = debounceMs;
    }

    connect(): void {
        this.disconnect();
        this.observer = new MutationObserver((mutations) => this.onMutations(mutations));
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    disconnect(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    private onMutations(mutations: MutationRecord[]): void {
        let toolbarInserted = false;

        outer: for (const mutation of mutations) {
            if (mutation.addedNodes.length === 0) continue;
            for (const node of Array.from(mutation.addedNodes)) {
                if (!node.instanceOf(HTMLElement)) continue;
                if (node.classList.contains('bases-toolbar') || node.querySelector('.bases-toolbar')) {
                    toolbarInserted = true;
                    break outer;
                }
            }
        }

        if (!toolbarInserted) return;
        this.schedule();
    }

    private schedule(): void {
        if (this.pending) return;
        this.pending = true;

        const now = Date.now();
        const delay = now - this.lastRun >= this.debounceMs ? 0 : this.debounceMs;

        void Promise.resolve().then(async () => {
            if (delay > 0) await new Promise((r) => setTimeout(r, delay));
            this.pending = false;
            this.lastRun = Date.now();
            void this.plugin.processAllViews();
        });
    }
}
