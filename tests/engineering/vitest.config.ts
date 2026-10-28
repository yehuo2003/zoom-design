import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('../../', import.meta.url)),
  test: { name: 'engineering', include: ['tests/engineering/**/*.spec.ts'], environment: 'node', testTimeout: 30000, passWithNoTests: false, allowOnly: false },
});
