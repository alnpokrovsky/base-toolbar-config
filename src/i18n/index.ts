// src/i18n/index.ts
import { getLanguage } from 'obsidian';
import type { I18NKey, Resource } from './keys';
import { en } from './en';
import { ru } from './ru';
import { zh } from './zh';

const RESOURCES: Record<string, Resource> = { en, ru, zh };
const FALLBACK_LANG = 'en';

// Normalize a raw language code to a known resource key.
// "zh-CN" → "zh", "ru-RU" → "ru", unknown → fallback.
function normalizeLang(raw: string): string {
    const base = raw.split('-')[0] ?? raw;
    const lower = base.toLowerCase();
    if (RESOURCES[lower]) return lower;
    if (RESOURCES[raw]) return raw;
    return FALLBACK_LANG;
}

// Resolve the active language once at module load.
// getLanguage() is the official Obsidian API and returns the user's
// configured interface language.
let activeLang = normalizeLang(getLanguage());

export function t(key: I18NKey, vars?: Record<string, string | number>): string {
    const dict = RESOURCES[activeLang] ?? RESOURCES[FALLBACK_LANG]!;
    let result = dict[key] ?? RESOURCES[FALLBACK_LANG]![key] ?? key;

    if (vars) {
        for (const [name, value] of Object.entries(vars)) {
            result = result.split(`{${name}}`).join(String(value));
        }
    }
    return result;
}

/**
 * Optional: re-detect the language if the user changes it at runtime.
 * Currently not wired to any event; kept for future use.
 */
export function refreshLanguage(): void {
    activeLang = normalizeLang(getLanguage());
}
