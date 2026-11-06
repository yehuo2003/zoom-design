import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'dialog-focus.e2e.ts',
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: '../../../.artifacts/task13/dialog-focus',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5195' },
});
