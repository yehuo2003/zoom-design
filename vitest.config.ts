import { defineConfig } from 'vitest/config';

const packages = process.env.ZOOM_UNIT_PACKAGES?.split(',') ?? ['core', 'dom', 'vue', 'react'];
if (packages.some(name => !['core', 'dom', 'vue', 'react'].includes(name))) throw Error('Unknown coverage package');

export default defineConfig({
  test: {
    projects: ['tests/engineering/vitest.config.ts', ...['core', 'dom', 'vue', 'react'].map(name => `packages/${name}/vitest.config.ts`)],
    passWithNoTests: false, allowOnly: false,
    coverage: {
      provider: 'v8', reportsDirectory: '.artifacts/task4/coverage/raw',
      reporter: ['json', 'json-summary', 'text-summary'],
      // Vitest5 matches against the first selected project root containing a file.
      // Engineering uses repo root; standalone package runs use their package root.
      include: ['src/**/*.{ts,tsx,vue}', 'test/fixtures/**/*.{ts,tsx,vue}', ...packages.flatMap(name => [`packages/${name}/src/**/*.{ts,tsx,vue}`, `packages/${name}/test/fixtures/**/*.{ts,tsx,vue}`])],
      exclude: ['**/*.d.ts', '**/test/fixtures/entry.*', '**/test/fixtures/vite.config.*'],
      thresholds: { 'packages/*/src/**': { lines: 80, statements: 80, functions: 80, branches: 80 } },
    },
  },
});
