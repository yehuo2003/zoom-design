import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const runId = process.env.ZOOM_SMOKE_RUN_ID;
if (!runId) throw Error('Dialog preview tests require an owned smoke-server run ID');

export default defineConfig({
  testDir: '.',
  testMatch: 'dialog-preview.e2e.ts',
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: fileURLToPath(new URL('../../../.artifacts/task13/dialog-preview/results.json', import.meta.url)) }]],
  outputDir: fileURLToPath(new URL('../../../.artifacts/task13/dialog-preview/test-results', import.meta.url)),
  metadata: { runId, mode: 'workspace', selection: 'vue', browser: 'chromium' },
  projects: [{ name: 'vue-chromium', use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5171' } }],
});
