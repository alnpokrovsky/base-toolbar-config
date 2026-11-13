import { describe, it, expect } from 'vitest';
import {
	cleanEmbedSrc,
	getExtension,
	isBaseFilePath,
} from '../../src/utils/path';

describe('cleanEmbedSrc', () => {
	it('strips anchor suffix', () => {
		expect(cleanEmbedSrc('projects.base#Рабочие задачи')).toBe('projects.base');
	});

	it('strips alias suffix', () => {
		expect(cleanEmbedSrc('projects.base|text')).toBe('projects.base');
	});

	it('strips both anchor and alias', () => {
		expect(cleanEmbedSrc('projects.base#view|alias')).toBe('projects.base');
	});

	it('decodes URL-encoding', () => {
		expect(cleanEmbedSrc('my%20file.base')).toBe('my file.base');
	});

	it('strips vault:// protocol', () => {
		expect(cleanEmbedSrc('vault://folder/file.base')).toBe('folder/file.base');
	});

	it('strips app:// protocol', () => {
		expect(cleanEmbedSrc('app://folder/file.base')).toBe('folder/file.base');
	});

	it('returns unchanged plain path', () => {
		expect(cleanEmbedSrc('folder/file.base')).toBe('folder/file.base');
	});
});

describe('getExtension', () => {
	it('returns extension without dot', () => {
		expect(getExtension('folder/file.base')).toBe('base');
		expect(getExtension('file.md')).toBe('md');
		expect(getExtension('noextension')).toBe('');
	});
});

describe('isBaseFilePath', () => {
	it('detects .base files', () => {
		expect(isBaseFilePath('projects.base')).toBe(true);
		expect(isBaseFilePath('folder/sub/file.base')).toBe(true);
		expect(isBaseFilePath('notes.md')).toBe(false);
		expect(isBaseFilePath('noextension')).toBe(false);
	});
});
