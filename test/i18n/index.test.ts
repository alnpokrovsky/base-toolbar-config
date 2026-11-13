import { describe, it, expect, beforeEach } from 'vitest';
import { t, refreshLanguage } from '../../src/i18n';
import { setLanguageForTests } from '../__mocks__/obsidian';

describe('i18n index', () => {
	beforeEach(() => {
		setLanguageForTests('en');
		refreshLanguage();
	});

	it('returns English strings by default', () => {
		expect(t('settings.title')).toBe('Base Toolbar Config');
	});

	it('interpolates vars', () => {
		expect(t('interface.title', { name: 'projects' })).toBe('⚙️ Interface (projects)');
	});

	it('falls back to English for unknown keys', () => {
		expect(t('nonexistent.key')).toBe('nonexistent.key');
	});

	it('switches to Russian', () => {
		setLanguageForTests('ru');
		refreshLanguage();
		expect(t('tabs.addDatabase')).toBe('+ Добавить .base');
		expect(t('dangerZone.cancelButton')).toBe('Отмена');
	});

	it('switches to Chinese', () => {
		setLanguageForTests('zh');
		refreshLanguage();
		expect(t('tabs.addDatabase')).toBe('+ 添加 .base');
		expect(t('dangerZone.cancelButton')).toBe('取消');
	});

	it('falls back to English for unsupported language codes', () => {
		setLanguageForTests('fr');
		refreshLanguage();
		expect(t('settings.title')).toBe('Base Toolbar Config');
		expect(t('tabs.addDatabase')).toBe('+ Add Base');
	});

	it('refreshLanguage re-detects language at runtime', () => {
		setLanguageForTests('zh');
		refreshLanguage();
		expect(t('tabs.addDatabase')).toBe('+ 添加 .base');

		setLanguageForTests('en');
		refreshLanguage();
		expect(t('tabs.addDatabase')).toBe('+ Add Base');
	});
});
