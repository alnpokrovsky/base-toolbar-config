/* eslint-disable */
// __mocks__/obsidian.ts
// Mock of the Obsidian API for unit testing. Only the surface used by
// src/main.ts is modeled; everything else returns sensible defaults.
// (Intentional `any` usage — this mocks a third-party API surface.)

// ---- Core classes ----

export class TFile {
	path: string;
	name: string;
	parent: TFolder | null;
	extension: string;
	basename: string;

	constructor(path: string, parent: TFolder | null = null) {
		this.path = path;
		this.name = path.split('/').pop() ?? path;
		this.extension = path.split('.').pop() ?? '';
		this.basename = this.name.replace(/\.[^/.]+$/, '') ?? path;
		this.parent = parent;
	}
}

export class TFolder {
	path: string;
	name: string;
	parent: TFolder | null;

	constructor(path: string, parent: TFolder | null = null) {
		this.path = path;
		this.name = path.split('/').pop() ?? path;
		this.parent = parent;
	}
}

export class TAbstractFile {
	path: string;
	name: string;
	parent: TFolder | null;

	constructor(path: string, parent: TFolder | null = null) {
		this.path = path;
		this.name = path.split('/').pop() ?? path;
		this.parent = parent;
	}
}

export class View {
	containerEl: HTMLElement;
	file?: TFile;

	constructor() {
		this.containerEl = document.createElement('div') as HTMLElement;
	}

	getState() {
		return {};
	}

	setState() {
		return Promise.resolve();
	}
}

export class WorkspaceLeaf {
	view: View;

	constructor(view?: View) {
		this.view = view ?? new View();
	}
}

// ---- Minimal DOM helpers so obsidian-style createEl/createDiv work ----
// Only patch when a DOM is available (jsdom/browser). In plain Node these
// are no-ops — pure-logic tests don't need them.

function patchElement() {
	if (typeof HTMLElement === 'undefined' || typeof document === 'undefined') return;
	if ((HTMLElement.prototype as any).createDiv) return;
	(HTMLElement.prototype as any).createDiv = function (opts: any = {}) {
		const el = document.createElement('div');
		if (opts.cls) el.className = opts.cls;
		if (opts.attr) {
			for (const [k, v] of Object.entries(opts.attr)) el.setAttribute(k, v);
		}
		if (opts.text) el.textContent = v;
		this.appendChild(el);
		return el;
	};
	(HTMLElement.prototype as any).createEl = function (tag: string, opts: any = {}) {
		const el = document.createElement(tag);
		if (opts.cls) el.className = opts.cls;
		if (opts.text) el.textContent = opts.text;
		this.appendChild(el);
		return el;
	};
	(HTMLElement.prototype as any).createSpan = function (opts: any = {}) {
		const el = document.createElement('span');
		if (opts.cls) el.className = opts.cls;
		if (opts.text) el.textContent = opts.text;
		this.appendChild(el);
		return el;
	};
	(HTMLElement.prototype as any).empty = function () {
		this.innerHTML = '';
	};
	(HTMLElement.prototype as any).setCssProps = function () {
		return this;
	};
	(HTMLElement.prototype as any).setText = function (t: string) {
		this.textContent = t;
		return this;
	};
	(HTMLElement.prototype as any).instanceOf = function (type: any) {
		// Cross-window-safe instanceof replacement per Obsidian API.
		return this instanceof type;
	};
	(HTMLElement.prototype as any).prepend = function (el: any) {
		this.insertBefore(el, this.firstChild);
	};
}
patchElement();

// ---- Minimal Setting/PluginSettingTab surface ----

export class Setting {
	settingEl: HTMLElement;
	constructor(containerEl: HTMLElement, plugin: any) {
		this.settingEl = document.createElement('div');
		containerEl.appendChild(this.settingEl);
	}
	addToggle(toggle: any) {
		toggle.setValue ? toggle.setValue(false) : null;
		return this;
	}
	addButton(btn: any) {
		btn.setIcon ? btn.setIcon('') : null;
		btn.setButtonText ? btn.setButtonText('') : null;
		btn.setTooltip ? btn.setTooltip('') : null;
		btn.setCta ? btn.setCta() : null;
		btn.setDestructive ? btn.setDestructive() : null;
		return this;
	}
	addDropdown(drop: any) {
		drop.addOption ? drop.addOption('', '') : null;
		drop.setValue ? drop.setValue('') : null;
		drop.onChange ? drop.onChange('') : null;
		return this;
	}
}

export class PluginSettingTab {
	containerEl: HTMLElement;
	plugin: any;
	display(): void {}
	constructor(app: any, plugin: any) {
		this.containerEl = document.createElement('div');
		this.plugin = plugin;
	}
}

export class Modal {
	contentEl: HTMLElement;
	constructor(app: any) {
		this.contentEl = document.createElement('div');
	}
	open() {}
	close() {}
	onOpen() {}
	onClose() {}
}

export class Notice {
	constructor(message: string, timeout?: number) {
		// no-op in tests
	}
}

export class FuzzySuggestModal<T> extends Modal {
	constructor(app: any) {
		super(app);
	}
	setPlaceholder(_p: string) {}
	getItems(): T[] { return []; }
	getItemText(_item: T): string { return ''; }
	onChooseItem(_item: T, _evt: any) {}
	renderSuggestion(_match: any, _el: HTMLElement) {}
}

// ---- Plugin ----

export class Plugin {
	app: any;
	settings!: any;

	constructor(app: any, manifest: any) {
		this.app = app;
	}

	async loadData(): Promise<any> { return {}; }
	async saveData(_data: any): Promise<void> { return; }

	addCommand(_cmd: any) {}
	addSettingTab(_tab: any) {}
	registerEvent(_event: any) { return { unload: () => {} }; }
	registerDomEvent(_target: any, _name: string, _handler: any) { return { unload: () => {} }; }
	registerInterval(_timer: any) { return { unload: () => {} }; }
}

// ---- Functions used by main.ts ----

export function getIconIds(): string[] {
	return ['layout-grid', 'layout-list', 'star', 'eye', 'eye-off', 'grip-vertical', 'trash', 'home'];
}

export function parseYaml(content: string): any {
	// Minimal YAML subset: handles flat key: value and simple lists.
	// Good enough for the .base YAML shapes the plugin reads.
	const result: any = {};
	let currentListKey: string | null = null;

	for (const rawLine of content.split('\n')) {
		const line = rawLine.replace(/^(\t|\s*)/, (m) => m);
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const listMatch = trimmed.match(/^-\s+(.*)$/);
		if (listMatch) {
			if (currentListKey) {
				if (!Array.isArray(result[currentListKey])) result[currentListKey] = [];
				result[currentListKey].push(listMatch[1].trim().replace(/^['"]|['"]$/g, ''));
			}
			continue;
		}

		const kvMatch = trimmed.match(/^([\w.]+)\s*:\s*(.*)$/);
		if (kvMatch) {
			currentListKey = null;
			const key = kvMatch[1];
			let value = kvMatch[2].trim().replace(/^['"]|['"]$/g, '');
			if (value === 'true') value = true;
			if (value === 'false') value = false;
			if (/^\d+$/.test(value)) value = Number(value);
			result[key] = value;
			continue;
		}

		const nestedMatch = trimmed.match(/^(\w+):\s*$/);
		if (nestedMatch) {
			currentListKey = nestedMatch[1];
			result[currentListKey] = [];
		}
	}

	return result;
}

export function getLanguage(): string {
	return _currentLang;
}

let _currentLang = 'en';
export function setLanguageForTests(lang: string) {
	_currentLang = lang;
}

export function setIcon(el: any, _icon: string) {
	// no-op in tests
}

// ---- Types (type-only re-exports are not needed at runtime, but we export
//    constructors so instanceof checks in main.ts work) ----
