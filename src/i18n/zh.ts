// src/i18n/locales/zh.ts
import type { I18NResource } from "ts-obsidian-i18n";
import type { I18NKeyMap } from "./keys";

export const zh: I18NResource<I18NKeyMap> = {
  "settings.title": "Base 视图切换器设置",
  "tabs.addDatabase": "+ 添加数据库",
  "tabs.emptyState": '请点击上方 "+ 添加数据库" 开始配置。',

  "interface.title": "⚙️ 界面美化 ({name})",
  "interface.enableCustomViewStyle.name": "启用自定义视图菜单样式",
  "interface.enableCustomViewStyle.desc": "解决小尺寸面板下挤压按钮的问题。",
  "interface.hideResultCount": '隐藏 "X 个结果"',
  "interface.hideSearch": '隐藏 "搜索" 按钮',
  "interface.hideProperties": '隐藏 "属性" 按钮',
  "interface.hideFilter": '隐藏 "筛选" 按钮',
  "interface.hideSort": '隐藏 "排序" 按钮',

  "defaultButton.title": "🏠 默认按钮",
  "defaultButton.enable": "启用默认按钮",
  "defaultButton.position": "默认按钮位置",
  "defaultButton.positionLeft": "靠左 (排在第一)",
  "defaultButton.positionRight": "靠右 (排在最后)",
  "defaultButton.selectView": "选择默认视图",

  "customButtons.title": "✨ 自定义按钮",
  "customButtons.addNew": "添加新按钮",
  "customButtons.addButton": "+ 添加",
  "customButtons.buttonLabel": "按钮 {index}",
  "customButtons.changeIcon": "更改图标",
  "customButtons.bindView": "绑定视图",
  "customButtons.delete": "删除",
  "customButtons.showAsIcon": "当前: 用图标展示",
  "customButtons.showAsText": "当前: 用视图名称展示 (宽屏)",

  "dangerZone.title": "危险操作",
  "dangerZone.desc": "删除当前数据库的专属视图配置。",
  "dangerZone.deleteButton": "删除此配置",
  "dangerZone.confirmMessage": '确定要删除 "{path}" 的所有自定义配置吗？',
  "dangerZone.confirmButton": "删除",
  "dangerZone.cancelButton": "取消",

  "modals.fileSuggestPlaceholder": "选择需要配置的 Base 数据库文件...",
  "modals.viewSuggestPlaceholder": "选择或搜索视图...",
  "modals.viewSuggestEmpty": "未找到视图，请检查文件是否为空",
  "modals.iconSuggestPlaceholder": "搜索图标...",

  "notices.switchFailed": "切换失败：无法锁定视图实例",
};
