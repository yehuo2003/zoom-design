import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { runBin } from './run-local-bin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const report = join(root, '.artifacts/task13/dialog-preview/results.json');
const runId = randomUUID();
let server;
const url = 'http://127.0.0.1:5171/__ready';
async function ready() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(750) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

try {
  assert.equal(await ready(), null, 'Port 5171 must be free before the owned Dialog preview run');
  mkdirSync(dirname(report), { recursive: true });
  rmSync(report, { force: true });
  server = spawn(process.execPath, [join(root, 'scripts/serve-smoke.mjs'), '--app', 'vue', '--mode', 'workspace', '--port', '5171'], {
    cwd: root, stdio: 'inherit', windowsHide: true, shell: false, env: { ...process.env, ZOOM_SMOKE_RUN_ID: runId },
  });
  let live = null;
  for (let attempt = 0; attempt < 200 && !live; attempt++) {
    live = await ready();
    if (!live) await new Promise(accept => setTimeout(accept, 100));
  }
  assert.deepEqual(live, { app: 'vue', mode: 'workspace', runId }, 'Owned Dialog preview did not become ready');
  process.env.ZOOM_SMOKE_RUN_ID = runId;
  const result = runBin(root, '@playwright/test', 'playwright', ['test', '--config', join(root, 'tests/engineering/dialog-preview/playwright.config.ts')]);
  assert.equal(result.status, 0, 'Dialog preview browser scenarios failed');
  const output = JSON.parse(readFileSync(report, 'utf8'));
  const executed = [];
  function collect(suites) {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) executed.push(...spec.tests ?? []);
      collect(suite.suites);
    }
  }
  collect(output.suites);
  assert.equal(executed.length, 6, 'Dialog preview scenario count changed');
  assert.ok(executed.every(test => test.status === 'expected' && test.results?.length === 1 && test.results[0].status === 'passed'));
  console.log(`Dialog preview browser gate passed: ${executed.length}/${executed.length}`);
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  if (server) {
    const closed = new Promise(accept => server.once('close', accept));
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGTERM');
    await Promise.race([closed, new Promise(accept => setTimeout(accept, 3000))]);
    if (server.exitCode === null && server.signalCode === null) {
      server.kill('SIGKILL');
      await closed;
    }
  }
}
