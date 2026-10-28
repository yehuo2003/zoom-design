import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { e2eSelection, hosts } from './scripts/e2e-plan.mjs';

const runId = process.env.ZOOM_SMOKE_RUN_ID ?? randomUUID();
const mode = process.env.ZOOM_SMOKE_MODE ?? 'workspace';
const selection = process.env.ZOOM_SMOKE_PACKAGE ?? 'all';
const browser = process.env.ZOOM_SMOKE_BROWSER ?? 'chromium';
const consumerRoot = process.env.ZOOM_SMOKE_CONSUMER_ROOT;
const plan = e2eSelection({ package: selection, browser, mode, consumerRoot });
const root = fileURLToPath(new URL('.', import.meta.url));
const shellQuote = (value: string) => process.platform === 'win32' ? `"${value}"` : `'${value.replaceAll("'", "'\\''")}'`;
const presets = { chromium: devices['Desktop Chrome'], firefox: devices['Desktop Firefox'], webkit: devices['Desktop Safari'] };
const output = `.artifacts/task4/playwright/${mode}/${selection}-${browser}`;

export default defineConfig({
  testDir: './e2e', fullyParallel: true, forbidOnly: true, retries: 0, workers: 2,
  timeout: 30000, expect: { timeout: 5000 },
  metadata: { runId, mode, selection, browser, scope: 'Engineering probes; product coverage N/A' },
  reporter: [['list'], ['json', { outputFile: `${output}/results.json` }], ['html', { outputFolder: `${output}/html`, open: 'never' }]],
  outputDir: `${output}/test-results`,
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', actionTimeout: 10000 },
  projects: plan.suites.flatMap((name: string) => plan.browsers.map((browser: keyof typeof presets) => ({
    name: `${name}-${browser}`, testMatch: `${name}/**/*.e2e.ts`,
    use: { ...presets[browser], baseURL: `http://127.0.0.1:${hosts[(['core', 'dom'].includes(name) ? 'platform' : name) as keyof typeof hosts]}` },
  }))),
  webServer: plan.hosts.map((name: keyof typeof hosts) => ({
    command: `${shellQuote(process.execPath)} ${shellQuote(join(root, 'scripts/serve-smoke.mjs'))} --app ${name} --mode ${mode} --port ${hosts[name]}`,
    url: `http://127.0.0.1:${hosts[name]}/__ready`, reuseExistingServer: false, timeout: 30000,
    env: { ZOOM_SMOKE_RUN_ID: runId, ...(consumerRoot ? { ZOOM_SMOKE_CONSUMER_ROOT: consumerRoot } : {}) },
  })),
});
