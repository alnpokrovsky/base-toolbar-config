import { describe, it, expect } from 'vitest';
import { HIDE_TOKEN_TO_CLASS, ALL_HIDE_CLASSES } from '../../src/toolbar/classes';

describe('toolbar/classes', () => {
	it('maps every token to a bth-hide-* class', () => {
		for (const [token, cls] of Object.entries(HIDE_TOKEN_TO_CLASS)) {
			expect(cls).toMatch(/^bth-hide-/);
			expect(token).not.toBe('');
		}
	});

	it('contains the shortcuts token for TaskNotes keyboard shortcuts button', () => {
		expect(HIDE_TOKEN_TO_CLASS.shortcuts).toBe('bth-hide-shortcuts');
	});

	it('contains the more token for TaskNotes More actions button', () => {
		expect(HIDE_TOKEN_TO_CLASS.more).toBe('bth-hide-more');
	});

	it('ALL_HIDE_CLASSES is derived from HIDE_TOKEN_TO_CLASS values', () => {
		expect(ALL_HIDE_CLASSES).toEqual(Object.values(HIDE_TOKEN_TO_CLASS));
	});

	it('has the expected number of tokens', () => {
		// 7 original + 1 shortcuts + 1 more = 9
		expect(Object.keys(HIDE_TOKEN_TO_CLASS)).toHaveLength(9);
	});
});