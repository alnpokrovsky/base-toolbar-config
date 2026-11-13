// src/toolbar/classes.ts
// Token -> CSS class mapping for the `toolbar.hide` YAML block and per-file
// settings. ALL_HIDE_CLASSES is derived from the mapping so the two can never
// drift out of sync.

export const HIDE_TOKEN_TO_CLASS: Record<string, string> = {
    search: 'bth-hide-search',
    filter: 'bth-hide-filter',
    sort: 'bth-hide-sort',
    properties: 'bth-hide-properties',
    group: 'bth-hide-group',
    views: 'bth-hide-views',
    'result-count': 'bth-hide-result-count',
};

export const ALL_HIDE_CLASSES: string[] = Object.values(HIDE_TOKEN_TO_CLASS);
