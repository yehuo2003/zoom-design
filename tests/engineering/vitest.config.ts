import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/engineering/**/*.spec.ts'], environment: 'node', testTimeout: 30000 },
});
