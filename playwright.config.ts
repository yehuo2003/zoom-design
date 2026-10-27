import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const runId = process.env.ZOOM_SMOKE_RUN_ID ?? randomUUID();
const selection = process.env.ZOOM_SMOKE_PACKAGE ?? 'platform';
if (!['all', 'platform', 'core', 'dom', 'vue', 'react', 'angular'].includes(selection)) throw Error(`Unknown smoke selection ${selection}`);
const hosts = { platform: 4170, vue: 4171, react: 4172, angular: 4173 };
const requiredHosts = selection === 'all' ? Object.keys(hosts) : ['core', 'dom', 'platform'].includes(selection) ? ['platform'] : [selection];
export default defineConfig({
  testDir: './e2e', fullyParallel: true, forbidOnly: true, retries: 0, workers: 2,
  timeout: 30000, expect: { timeout: 5000 },
  metadata: { runId, scope: 'Workspace engineering probes only; no product API' },
  reporter: [['list'], ['json', { outputFile: `.artifacts/task3/playwright/${selection}-results.json` }]],
  outputDir: `.artifacts/task3/playwright/${selection}-test-results`,
  use: { baseURL: 'http://127.0.0.1:4170', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'core-chromium', testMatch: 'core/**/*.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'dom-chromium', testMatch: 'dom/**/*.spec.ts', use: { ...devices['Desktop Chrome'] } },
    ...(['vue', 'react', 'angular'] as const).map(name => ({ name: `${name}-chromium`, testMatch: `${name}/**/*.spec.ts`, use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${hosts[name]}` } })),
  ],
  webServer: requiredHosts.map(name => ({
    command: `node scripts/serve-smoke.mjs --app ${name} --mode workspace --port ${hosts[name as keyof typeof hosts]}`,
    url: `http://127.0.0.1:${hosts[name as keyof typeof hosts]}/__ready`, reuseExistingServer: false, timeout: 30000,
    env: { ZOOM_SMOKE_RUN_ID: runId },
  })),
});
