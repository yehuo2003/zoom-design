import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'dialog-review.e2e.ts', workers: 1, retries: 0, forbidOnly: true,
  reporter: [['list'], ['json', { outputFile: '../../../.artifacts/task13/review-fix/results.json' }]],
  outputDir: '../../../.artifacts/task13/review-fix/test-results',
  use: { baseURL: 'http://127.0.0.1:5216', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
});
