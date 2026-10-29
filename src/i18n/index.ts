// src/i18n/index.ts
import { App } from "obsidian";
import { I18NService } from "ts-obsidian-i18n";
import type { I18NResourcesByLang } from "ts-obsidian-i18n";
import type { I18NKeyMap } from "./keys";
import { en } from "./en";
import { ru } from "./ru";
import { zh } from "./zh";

const RESOURCES: I18NResourcesByLang<I18NKeyMap> = { en, ru, zh };

let translate: ((key: keyof I18NKeyMap) => string) | null = null;

// Инициализация должна вызываться из onload() плагина,
// чтобы передать app и дать библиотеке определить язык Obsidian.
export function initI18n(app: App): void {
  translate = I18NService.init({
    resources: RESOURCES,
    fallbackLanguage: "en",
    app,
  });
}

export function t(key: keyof I18NKeyMap, vars?: Record<string, string | number>): string {
  if (!translate) {
    // Если t() вызван до initI18n — возвращаем ключ, чтобы не падать.
    return key;
  }
  let result = translate(key);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      result = result.split(`{${name}}`).join(String(value));
    }
  }
  return result;
}
