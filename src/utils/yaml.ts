// src/utils/yaml.ts
// .base YAML parsing over the Obsidian Vault API, backed by a shared cache.

import { TFile, parseYaml, Vault } from 'obsidian';
import { isRecord } from './settings';

export interface ParsedBaseFile {
    views: string[];
    hide: string[];
}

/**
 * Read and parse a `.base` file's YAML, caching the result keyed by file path.
 * Returns the cached value when present. Never mutates the input cache entry.
 */
export async function parseBaseFile(
    vault: Vault,
    cache: Record<string, ParsedBaseFile>,
    filePath: string,
): Promise<ParsedBaseFile> {
    const cached = cache[filePath];
    if (cached) return cached;

    const file = vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
        return { views: [], hide: [] };
    }

    const result: ParsedBaseFile = { views: [], hide: [] };
    try {
        const content = await vault.cachedRead(file);
        const parsed: unknown = parseYaml(content);
        if (isRecord(parsed)) {
            if (Array.isArray(parsed.views)) {
                for (const v of parsed.views) {
                    if (isRecord(v) && typeof v.name === 'string') {
                        result.views.push(v.name);
                    }
                }
            }
            if (isRecord(parsed.toolbar) && Array.isArray(parsed.toolbar.hide)) {
                for (const item of parsed.toolbar.hide) {
                    if (typeof item === 'string') result.hide.push(item);
                }
            }
        }
    } catch (e) {
        console.error(`Failed to parse ${filePath}`, e);
    }

    cache[filePath] = result;
    return result;
}
