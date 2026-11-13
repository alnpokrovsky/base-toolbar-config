import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			// The obsidian module only exists inside the Obsidian app.
			// In tests we substitute a lightweight mock so pure logic can run in Node.
			obsidian: resolve(__dirname, 'test/__mocks__/obsidian.ts'),
		},
	},
	test: {
		include: ['test/**/*.test.ts'],
		environment: 'node',
	},
});
