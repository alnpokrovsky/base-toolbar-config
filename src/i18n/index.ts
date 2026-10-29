// src/i18n/index.ts
import { I18NService } from "ts-obsidian-i18n";
import type { I18NResourcesByLang } from "ts-obsidian-i18n";
import type { I18NKeyMap } from "./keys";
import { en } from "./en";
import { ru } from "./ru";
import { zh } from "./zh";

const RESOURCES: I18NResourcesByLang<I18NKeyMap> = { en, ru, zh };

// ts-obsidian-i18n's I18N() accepts only a key — it has NO built-in
// interpolation support (confirmed by its documentation). We wrap it here
// and perform {var} substitution ourselves in plain JS.
const rawI18N = I18NService.init({
  resources: RESOURCES,
  fallbackLanguage: "en",
});

// The key must be one of the known keys — this gives compile-time safety
// and matches what rawI18N expects.
export type TranslationKey = keyof I18NKeyMap;

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  let result = rawI18N(key);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      // Simple split/join — no regex, no escape issues.
      result = result.split(`{${name}}`).join(String(value));
    }
  }
  return result;
}

// Re-export the raw translator for cases where interpolation isn't needed.
export { rawI18N as I18N };
