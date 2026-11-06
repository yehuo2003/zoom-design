import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'dialog-composition.e2e.ts',
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: '../../../.artifacts/task13/dialog-composition',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5196' },
});
