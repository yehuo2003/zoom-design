import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: '.', testMatch: '*.e2e.ts', fullyParallel: true, forbidOnly: true, retries: 0, workers: 2,
  outputDir: '../../../.artifacts/task8/current/test-results',
  reporter: [['list'], ['json', { outputFile: '.artifacts/task8/current/browser-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:5188', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: { command: `"${process.execPath}" "${fileURLToPath(new URL('./server.mjs', import.meta.url))}"`, url: 'http://127.0.0.1:5188', reuseExistingServer: false },
});
