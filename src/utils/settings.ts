// src/utils/settings.ts
// Pure settings defaults and merge logic. No Obsidian API dependency.

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

export const DEFAULT_FILE_CONFIG: FileConfig = {
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
	enableCustomViewStyle: false,
};

export const DEFAULT_SETTINGS: BvsSettings = {
	fileConfigs: {},
};

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Merge raw persisted settings with defaults, normalizing each file config.
 * Mirrors BaseToolbarConfigPlugin.loadSettings().
 * Does not mutate the input.
 */
export function mergeSettings(raw: unknown): BvsSettings {
	const input = isRecord(raw) ? raw : {};
	const fileConfigs: Record<string, FileConfig> = {};

	const rawFileConfigs = input.fileConfigs;
	if (isRecord(rawFileConfigs)) {
		for (const [path, cfg] of Object.entries(rawFileConfigs)) {
			const recordCfg = isRecord(cfg) ? cfg : ({} as Record<string, unknown>);
			const buttons: ButtonConfig[] = Array.isArray(recordCfg.buttons)
				? (recordCfg.buttons as ButtonConfig[])
				: [];

			fileConfigs[path] = {
				...DEFAULT_FILE_CONFIG,
				...recordCfg,
				buttons,
			};
		}
	}

	return { fileConfigs };
}
