import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'dialog-shell.e2e.ts',
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: '../../../.artifacts/task13/dialog-shell',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5193' },
});
