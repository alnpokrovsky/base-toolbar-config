// src/i18n/keys.ts
import "ts-obsidian-i18n";

// Registry of all translatable keys.
// Every call to t() must use a key listed here — otherwise TypeScript will fail.
export const I18NKeys = {
  // Headers and tabs
  "settings.title": true,
  "tabs.addDatabase": true,
  "tabs.emptyState": true,

  // "Interface" section
  "interface.title": true,
  "interface.enableCustomViewStyle.name": true,
  "interface.enableCustomViewStyle.desc": true,
  "interface.hideResultCount": true,
  "interface.hideSearch": true,
  "interface.hideProperties": true,
  "interface.hideFilter": true,
  "interface.hideSort": true,

  // "Default Button" section
  "defaultButton.title": true,
  "defaultButton.enable": true,
  "defaultButton.position": true,
  "defaultButton.positionLeft": true,
  "defaultButton.positionRight": true,
  "defaultButton.selectView": true,

  // "Custom Buttons" section
  "customButtons.title": true,
  "customButtons.addNew": true,
  "customButtons.addButton": true,
  "customButtons.buttonLabel": true,
  "customButtons.changeIcon": true,
  "customButtons.bindView": true,
  "customButtons.delete": true,
  "customButtons.showAsIcon": true,
  "customButtons.showAsText": true,

  // Danger zone
  "dangerZone.title": true,
  "dangerZone.desc": true,
  "dangerZone.deleteButton": true,
  "dangerZone.confirmMessage": true,
  "dangerZone.confirmButton": true,
  "dangerZone.cancelButton": true,

  // Modals
  "modals.fileSuggestPlaceholder": true,
  "modals.viewSuggestPlaceholder": true,
  "modals.viewSuggestEmpty": true,
  "modals.iconSuggestPlaceholder": true,

  // Notices
  "notices.switchFailed": true,
} as const;

export type I18NKeyMap = typeof I18NKeys;

// Module augmentation so ts-obsidian-i18n knows about our key map.
declare module "ts-obsidian-i18n" {
  type I18NKeyMap = typeof I18NKeys;
}
