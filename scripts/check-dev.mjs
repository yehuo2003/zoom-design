import { fork, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { ProcessGroup } from './process-group.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = join(root, '.artifacts/task3'); mkdirSync(artifacts, { recursive: true });
const style = join(root, 'packages/vue/src/styles/style.scss'); const source = join(root, 'packages/vue/src/index.ts');
const originalStyle = readFileSync(style); const originalSource = readFileSync(source);
writeFileSync(join(artifacts, 'dev-original-style.scss'), originalStyle); writeFileSync(join(artifacts, 'dev-original-index.ts'), originalSource);
const logfile = join(artifacts, 'dev-validation.log'); writeFileSync(logfile, '');
const evidence = []; let child; let exit; let browser;
const cleanup = new ProcessGroup();
const delay = ms => new Promise(accept => setTimeout(accept, ms));
async function waitFor(check, label, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { try { if (await check()) return; } catch { /* not ready */ } await delay(100); }
  throw Error(`Timed out: ${label}`);
}
async function listening() { try { const response = await fetch('http://127.0.0.1:5171/__ready', { signal: AbortSignal.timeout(750) }); return response.ok; } catch { return false; } }
function start() {
  child = fork(join(root, 'scripts/dev.mjs'), ['--app', 'vue'], { cwd: root, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => appendFileSync(logfile, data));
  exit = new Promise((accept, reject) => { child.once('error', reject); child.once('exit', (code, signal) => accept({ code, signal })); });
}
async function interrupt() {
  if (child?.exitCode === null && child?.signalCode === null) {
    if (child.connected) child.send({ type: 'signal', signal: 'SIGINT' });
    await waitFor(() => child.exitCode !== null || child.signalCode !== null, 'managed SIGINT exit');
  }
}
try {
  assert.equal(await listening(), false, '5171 must be free before this owned validation');
  start(); await waitFor(listening, 'Vue native preview');
  browser = await chromium.launch({ headless: true }); const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5171');
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  evidence.push({ check: 'native Vue preview interaction', status: 'PASS' });
  writeFileSync(style, Buffer.concat([originalStyle, Buffer.from('\n.zoom-engineering-probe { --zoom-dev-watch-proof: passed; }\n')]));
  await page.waitForFunction(() => {
    const element = document.querySelector('.zoom-engineering-probe');
    return element && getComputedStyle(element).getPropertyValue('--zoom-dev-watch-proof').trim() === 'passed';
  }, undefined, { timeout: 20000 });
  await page.screenshot({ path: join(artifacts, 'vue-dev-watch.png'), fullPage: true });
  evidence.push({ check: 'SCSS change rebuilt and appeared in live preview', status: 'PASS' });
  writeFileSync(source, Buffer.concat([originalSource, Buffer.from('\nconst invalidEngineeringBuild: string = 1;\n')]));
  await waitFor(() => child.exitCode !== null, 'failed package type rebuild exits');
  const failed = await exit; assert.notEqual(failed.code, 0);
  await waitFor(async () => !await listening(), 'failed build closes preview');
  assert.match(readFileSync(logfile, 'utf8'), /not assignable to type 'string'/);
  evidence.push({ check: 'invalid package TS visibly fails and removes stale service', status: 'PASS', exit: failed.code });
  writeFileSync(style, originalStyle); writeFileSync(source, originalSource);
  start(); await waitFor(listening, 'restored Vue preview');
  await interrupt(); const stopped = await exit; assert.equal(stopped.code, 0);
  await waitFor(async () => !await listening(), 'SIGINT closes owned preview');
  evidence.push({ check: 'parent-forwarded SIGINT handler shuts down owned process tree', status: 'PASS', exit: stopped.code });
} finally {
  await browser?.close();
  if (child?.exitCode === null && child?.signalCode === null) {
    try { await interrupt(); } catch { await cleanup.stopChild(child); }
  }
  writeFileSync(style, originalStyle); writeFileSync(source, originalSource);
  const restore = spawnSync(process.execPath, [join(root, 'scripts/build-framework.mjs'), 'vue'], { cwd: root, encoding: 'utf8' });
  appendFileSync(logfile, restore.stdout + restore.stderr);
  writeFileSync(join(artifacts, 'dev-validation.json'), JSON.stringify(evidence, null, 2) + '\n');
  if (restore.status !== 0) throw Error('Restored Vue build failed');
}
console.log(JSON.stringify(evidence, null, 2));
