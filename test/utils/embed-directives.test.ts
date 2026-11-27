import { describe, it, expect } from 'vitest';
import { extractHideDirectives } from '../../src/utils/embed-directives';

describe('embed-directives', () => {
    it('extracts single directive from alias', () => {
        expect(extractHideDirectives('projects.base|hide-new')).toEqual(['new']);
    });

    it('extracts multiple directives separated by comma', () => {
        expect(extractHideDirectives('projects.base|hide-search,hide-more')).toEqual(['search', 'more']);
    });

    it('extracts multiple directives separated by space', () => {
        expect(extractHideDirectives('projects.base|hide-new hide-shortcuts')).toEqual(['new', 'shortcuts']);
    });

    it('handles mixed separators', () => {
        expect(extractHideDirectives('projects.base|hide-search, hide-filter hide-sort')).toEqual(['search', 'filter', 'sort']);
    });

    it('ignores unknown directives', () => {
        expect(extractHideDirectives('projects.base|hide-unknown hide-new')).toEqual(['new']);
    });

    it('is case-insensitive', () => {
        expect(extractHideDirectives('projects.base|HIDE-NEW Hide-Search')).toEqual(['new', 'search']);
    });

    it('handles alias with plain text and directives', () => {
        expect(extractHideDirectives('projects.base|My View hide-new')).toEqual(['new']);
    });

    it('returns empty array when no alias', () => {
        expect(extractHideDirectives('projects.base')).toEqual([]);
        expect(extractHideDirectives('projects.base#view')).toEqual([]);
    });

    it('returns empty array when alias has no hide-* directives', () => {
        expect(extractHideDirectives('projects.base|just a label')).toEqual([]);
    });

    it('strips anchor before processing', () => {
        expect(extractHideDirectives('projects.base#table|hide-new')).toEqual(['new']);
    });

    it('handles URL-encoded alias', () => {
        expect(extractHideDirectives('projects.base|My%20View%20hide-new')).toEqual(['new']);
    });

    it('handles protocol prefixes', () => {
        expect(extractHideDirectives('vault://projects.base|hide-new')).toEqual(['new']);
        expect(extractHideDirectives('app://projects.base|hide-new')).toEqual(['new']);
    });
});