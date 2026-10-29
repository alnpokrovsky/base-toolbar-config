// src/i18n/locales/ru.ts
import type { I18NResource } from "ts-obsidian-i18n";
import type { I18NKeyMap } from "./keys";

export const ru: I18NResource<I18NKeyMap> = {
  "settings.title": "Настройки Base View Switcher",
  "tabs.addDatabase": "+ Добавить базу",
  "tabs.emptyState": 'Нажмите "+ Добавить базу" выше, чтобы начать.',

  "interface.title": "⚙️ Интерфейс ({name})",
  "interface.enableCustomViewStyle.name": "Включить кастомный стиль меню видов",
  "interface.enableCustomViewStyle.desc": "Исправляет сжатие кнопок в маленьких панелях.",
  "interface.hideResultCount": 'Скрыть "X результатов"',
  "interface.hideSearch": 'Скрыть кнопку "Поиск"',
  "interface.hideProperties": 'Скрыть кнопку "Свойства"',
  "interface.hideFilter": 'Скрыть кнопку "Фильтр"',
  "interface.hideSort": 'Скрыть кнопку "Сортировка"',

  "defaultButton.title": "🏠 Кнопка по умолчанию",
  "defaultButton.enable": "Включить кнопку по умолчанию",
  "defaultButton.position": "Позиция кнопки по умолчанию",
  "defaultButton.positionLeft": "Слева (первая)",
  "defaultButton.positionRight": "Справа (последняя)",
  "defaultButton.selectView": "Выбрать вид по умолчанию",

  "customButtons.title": "✨ Пользовательские кнопки",
  "customButtons.addNew": "Добавить новую кнопку",
  "customButtons.addButton": "+ Добавить",
  "customButtons.buttonLabel": "Кнопка {index}",
  "customButtons.changeIcon": "Изменить иконку",
  "customButtons.bindView": "Привязать вид",
  "customButtons.delete": "Удалить",
  "customButtons.showAsIcon": "Текущий: вид иконкой",
  "customButtons.showAsText": "Текущий: вид текстом (широкая панель)",

  "dangerZone.title": "Опасная зона",
  "dangerZone.desc": "Удалить конфигурацию видов для текущей базы.",
  "dangerZone.deleteButton": "Удалить эту конфигурацию",
  "dangerZone.confirmMessage": 'Вы уверены, что хотите удалить все настройки для "{path}"?',
  "dangerZone.confirmButton": "Удалить",
  "dangerZone.cancelButton": "Отмена",

  "modals.fileSuggestPlaceholder": "Выберите .base файл для настройки...",
  "modals.viewSuggestPlaceholder": "Выберите или найдите вид...",
  "modals.viewSuggestEmpty": "Виды не найдены. Проверьте, не пуст ли файл.",
  "modals.iconSuggestPlaceholder": "Поиск иконки...",

  "notices.switchFailed": "Не удалось переключить вид: экземпляр не захвачен.",
};
