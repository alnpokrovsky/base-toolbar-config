// src/utils/embed-directives.ts
// Parse hide-* directives from embed alias/src attribute.
// Pure logic, no Obsidian API — easy to unit test.

import { HIDE_TOKEN_TO_CLASS } from '../toolbar/classes';

/**
 * Extract hide-* tokens from an embed src/alt string.
 * Handles: `file.base|hide-new`, `file.base#view|hide-search,hide-more`,
 * `file.base|my alias hide-new`, URL-encoded variants, etc.
 * Returns only known tokens from HIDE_TOKEN_TO_CLASS.
 */
export function extractHideDirectives(raw: string): string[] {
    // 1. Split into path part and alias part
    const parts = raw.split('|');
    if (parts.length <= 1) return []; // no alias, no directives

    // Path is everything before first | (may contain #anchor)
    // Alias is everything after first | (may contain additional | chars)
    const alias = parts.slice(1).join('|');

    // 2. Decode alias (handles URL-encoded spaces, etc.)
    const decodedAlias = decodeURIComponent(alias);

    // 3. Split alias into tokens by whitespace or comma
    const tokens = decodedAlias
        .split(/[\s,]+/)
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

    // 4. Keep only known hide-* prefixes
    const hidePrefix = 'hide-';
    const result: string[] = [];
    for (const token of tokens) {
        if (!token.startsWith(hidePrefix)) continue;
        const key = token.slice(hidePrefix.length);
        if (key in HIDE_TOKEN_TO_CLASS) {
            result.push(key);
        }
        // unknown tokens silently ignored
    }
    return result;
}