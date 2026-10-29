// src/i18n/keys.ts
import "ts-obsidian-i18n";

export const I18NKeys = {
  "settings.title": true,
  "tabs.addDatabase": true,
  "tabs.emptyState": true,

  "interface.title": true,
  "interface.enableCustomViewStyle.name": true,
  "interface.enableCustomViewStyle.desc": true,
  "interface.hideResultCount": true,
  "interface.hideSearch": true,
  "interface.hideProperties": true,
  "interface.hideFilter": true,
  "interface.hideSort": true,
  "interface.hideGroup": true,
  "interface.hideViews": true,

  "defaultButton.title": true,
  "defaultButton.enable": true,
  "defaultButton.position": true,
  "defaultButton.positionLeft": true,
  "defaultButton.positionRight": true,
  "defaultButton.selectView": true,

  "customButtons.title": true,
  "customButtons.addNew": true,
  "customButtons.addButton": true,
  "customButtons.buttonLabel": true,
  "customButtons.changeIcon": true,
  "customButtons.bindView": true,
  "customButtons.delete": true,
  "customButtons.showAsIcon": true,
  "customButtons.showAsText": true,

  "dangerZone.title": true,
  "dangerZone.desc": true,
  "dangerZone.deleteButton": true,
  "dangerZone.confirmMessage": true,
  "dangerZone.confirmButton": true,
  "dangerZone.cancelButton": true,

  "modals.fileSuggestPlaceholder": true,
  "modals.viewSuggestPlaceholder": true,
  "modals.viewSuggestEmpty": true,
  "modals.iconSuggestPlaceholder": true,

  "notices.switchFailed": true,
} as const;

export type I18NKeyMap = typeof I18NKeys;

declare module "ts-obsidian-i18n" {
  type I18NKeyMap = typeof I18NKeys;
}
