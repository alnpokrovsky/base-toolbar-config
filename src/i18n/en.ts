// src/i18n/locales/en.ts
import type { I18NResource } from "ts-obsidian-i18n";
import type { I18NKeyMap } from "./keys";

// Canonical translation source. Placeholders use single braces: {var}.
// Substitution is performed in the t() helper, not by the library.
export const en: I18NResource<I18NKeyMap> = {
  "settings.title": "Base View Switcher Settings",
  "tabs.addDatabase": "+ Add Database",
  "tabs.emptyState": 'Click "+ Add Database" above to start.',

  "interface.title": "⚙️ Interface ({name})",
  "interface.enableCustomViewStyle.name": "Enable custom view menu style",
  "interface.enableCustomViewStyle.desc": "Fixes button squeezing in small panels.",
  "interface.hideResultCount": 'Hide "X results"',
  "interface.hideSearch": 'Hide "Search" button',
  "interface.hideProperties": 'Hide "Properties" button',
  "interface.hideFilter": 'Hide "Filter" button',
  "interface.hideSort": 'Hide "Sort" button',

  "defaultButton.title": "🏠 Default Button",
  "defaultButton.enable": "Enable default button",
  "defaultButton.position": "Default button position",
  "defaultButton.positionLeft": "Left (first)",
  "defaultButton.positionRight": "Right (last)",
  "defaultButton.selectView": "Select default view",

  "customButtons.title": "✨ Custom Buttons",
  "customButtons.addNew": "Add new button",
  "customButtons.addButton": "+ Add",
  "customButtons.buttonLabel": "Button {index}",
  "customButtons.changeIcon": "Change icon",
  "customButtons.bindView": "Bind view",
  "customButtons.delete": "Delete",
  "customButtons.showAsIcon": "Current: icon view",
  "customButtons.showAsText": "Current: text view (wide panel)",

  "dangerZone.title": "Danger Zone",
  "dangerZone.desc": "Delete custom view configuration for the current database.",
  "dangerZone.deleteButton": "Delete this configuration",
  "dangerZone.confirmMessage": 'Are you sure you want to delete all custom settings for "{path}"?',
  "dangerZone.confirmButton": "Delete",
  "dangerZone.cancelButton": "Cancel",

  "modals.fileSuggestPlaceholder": "Select a Base file to configure...",
  "modals.viewSuggestPlaceholder": "Select or search for a view...",
  "modals.viewSuggestEmpty": "No views found. Check if the file is empty.",
  "modals.iconSuggestPlaceholder": "Search for an icon...",

  "notices.switchFailed": "Failed to switch view: could not lock the view instance.",
};
