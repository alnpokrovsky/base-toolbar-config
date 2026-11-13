// src/commands.ts
// Stable command IDs registered via this.addCommand().
// IDs must never change after release — they are referenced by hotkeys.

import { BaseToolbarConfigPlugin } from './main';

export const CMD_OPEN_SETTINGS = 'bvs-open-settings';
export const CMD_REFRESH_TOOLBAR = 'bvs-refresh-toolbar';

export function registerCommands(plugin: BaseToolbarConfigPlugin): void {
    plugin.addCommand({
        id: CMD_OPEN_SETTINGS,
        name: 'Open settings',
        icon: 'settings',
        callback: () => {
            // Obsidian does not expose a public API to open a specific plugin's
            // settings tab. This command is registered for stable ID/hotkey use
            // and remains a no-op until such an API is available.
        },
    });

    plugin.addCommand({
        id: CMD_REFRESH_TOOLBAR,
        name: 'Refresh toolbar',
        icon: 'refresh-ccw',
        callback: () => {
            void plugin.processAllViews();
        },
    });
}
