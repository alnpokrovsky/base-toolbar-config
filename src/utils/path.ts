// src/utils/path.ts
// Pure helpers for resolving embed src attributes to .base file paths.
// No Obsidian API dependency — easy to unit test in Node.

/** Protocols stripped from embed src before resolution. */
const VAULT_PROTOCOLS = ['vault://', 'app://'];

/**
 * Clean an embed src down to a raw path candidate.
 * Handles anchors (`file.base#view`), aliases (`file.base|text`),
 * URL-encoding, and vault:// / app:// protocol prefixes.
 */
export function cleanEmbedSrc(src: string): string {
	let clean = src.split('#')[0] ?? src;
	clean = clean.split('|')[0] ?? clean;
	clean = decodeURIComponent(clean);
	for (const proto of VAULT_PROTOCOLS) {
		clean = clean.replace(new RegExp(`^${proto.replace(/[/\\^$*+?()|.[{}]/g, '\\$&')}`), '');
	}
	return clean;
}

/**
 * Extract the file extension from a path candidate.
 * Returns the extension without the leading dot, or empty string.
 */
export function getExtension(filePath: string): string {
	const parts = filePath.split('.');
	const ext = parts.length > 1 ? parts[parts.length - 1] : undefined;
	return ext ?? '';
}

/**
 * Check whether a path candidate looks like a .base file.
 */
export function isBaseFilePath(filePath: string): boolean {
	return getExtension(filePath) === 'base';
}
