import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: { environment: 'node', include: ['test/**/*.spec.ts'], coverage: { provider: 'v8', reportsDirectory: '../../.artifacts/task2/coverage/core' } },
});
