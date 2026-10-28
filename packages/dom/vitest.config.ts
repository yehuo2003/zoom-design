import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: { name: 'dom', environment: 'jsdom', include: ['test/**/*.spec.ts'], passWithNoTests: false, allowOnly: false, coverage: { provider: 'v8', reportsDirectory: '../../.artifacts/task2/coverage/dom' } },
});
