import { describe, it, expect } from 'vitest';
import { t } from '../../src/i18n';

describe('i18n t()', () => {
	it('returns the key when no translation exists (fallback behavior)', () => {
		expect(t('settings.title')).toBe('Base Toolbar Config');
	});

	it('interpolates vars', () => {
		expect(t('interface.title', { name: 'projects' })).toBe('⚙️ Interface (projects)');
	});

	it('interpolates button index', () => {
		expect(t('customButtons.buttonLabel', { index: 3 })).toBe('Button 3');
	});

	it('returns unknown keys unchanged', () => {
		expect(t('nonexistent.key')).toBe('nonexistent.key');
	});

	it('handles missing vars gracefully (literal braces remain)', () => {
		expect(t('customButtons.buttonLabel', {})).toBe('Button {index}');
	});
});
