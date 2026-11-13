import { describe, it, expect } from 'vitest';
import { mergeSettings, DEFAULT_SETTINGS } from '../../src/utils/settings';

describe('mergeSettings', () => {
	it('returns defaults for empty/raw undefined input', () => {
		const result = mergeSettings(undefined);
		expect(result.fileConfigs).toEqual({});
	});

	it('preserves provided file configs merged with defaults', () => {
		const result = mergeSettings({
			fileConfigs: {
				'projects.base': {
					hideSearch: true,
					buttons: [{ icon: 'star', viewName: 'My View', showText: false }],
				},
			},
		});

		const cfg = result.fileConfigs['projects.base'];
		expect(cfg.hideSearch).toBe(true);
		// Defaults filled in for unspecified keys
		expect(cfg.hideFilter).toBe(false);
		expect(cfg.hideSort).toBe(false);
		expect(cfg.enableDefault).toBe(false);
		expect(cfg.defaultPosition).toBe('left');
		expect(cfg.defaultViewName).toBe('Main view');
		expect(cfg.buttons).toEqual([{ icon: 'star', viewName: 'My View', showText: false }]);
	});

	it('normalizes non-array buttons to []', () => {
		const result = mergeSettings({
			fileConfigs: {
				'projects.base': { buttons: null as unknown as unknown[] },
			},
		});
		expect(result.fileConfigs['projects.base'].buttons).toEqual([]);
	});

	it('does not mutate the input', () => {
		const raw = { fileConfigs: { 'projects.base': { hideSearch: true } } };
		const copy = JSON.parse(JSON.stringify(raw)) as typeof raw;
		mergeSettings(raw);
		expect(raw).toEqual(copy);
	});

	it('matches DEFAULT_SETTINGS shape', () => {
		const result = mergeSettings({});
		expect(result).toEqual(DEFAULT_SETTINGS);
	});
});
