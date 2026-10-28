import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { ProcessGroup } from '../../scripts/process-group.mjs';

const root = resolve(import.meta.dirname, '../..');
const runId = randomUUID(); const directory = join(root, '.artifacts/task6', runId);
mkdirSync(directory, { recursive: true });
const source = join(root, 'design/styles/_defaults.scss'); const original = readFileSync(source);
const log = join(directory, 'watch.log'); const records = [];
const group = new ProcessGroup(); let child; let browser;
writeFileSync(join(root, '.artifacts/task6/watch-latest.json'), JSON.stringify({ runId, directory, status: 'running' }));
async function ready() { try { return (await fetch('http://127.0.0.1:5171/__ready', { signal: AbortSignal.timeout(500) })).ok; } catch { return false; } }
async function until(check, label, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { try { if (await check()) return; } catch { /* rebuilding */ } await new Promise(accept => setTimeout(accept, 150)); }
  throw Error(`Timed out: ${label}`);
}
function start() {
  child = group.start(process.execPath, [join(root, 'scripts/dev.mjs'), '--app', 'vue'], { cwd: root, label: 'owned theme watch', transient: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => appendFileSync(log, data));
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (child.connected) child.send({ type: 'signal', signal: 'SIGINT' });
  try { await until(() => child.exitCode !== null, 'owned watch shutdown'); }
  finally { await group.stopChild(child); }
}
let status = 'failed';
try {
  assert.equal(await ready(), false, '5171 must be free');
  start(); await until(ready, 'initial theme preview');
  browser = await chromium.launch(); const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5171/theme');
  assert.equal(await page.getByTestId('default-sample').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(37, 99, 235)');
  records.push({ check: 'initial theme preview', status: 'passed' });
  const modified = original.toString().replace('$color-primary: #2563eb !default;', '$color-primary: #e11d48 !default;');
  assert.notEqual(modified, original.toString()); writeFileSync(source, modified);
  await until(async () => {
    if (!await ready()) return false;
    await page.goto('http://127.0.0.1:5171/theme');
    return await page.getByTestId('default-sample').evaluate(node => getComputedStyle(node).backgroundColor) === 'rgb(225, 29, 72)';
  }, 'shared design change appears in preview');
  await page.screenshot({ path: join(directory, 'watch-theme.png'), fullPage: true });
  records.push({ check: 'design/styles triggers rebuild and changed computed style', status: 'passed' });
  writeFileSync(source, `${original}\n@error "Task6 theme watch failure";\n`);
  await until(() => child.exitCode !== null, 'bad Sass stops preview');
  assert.notEqual(child.exitCode, 0); await until(async () => !await ready(), 'old preview is closed');
  assert.match(readFileSync(log, 'utf8'), /Task6 theme watch failure/);
  for (const file of ['theme.css', 'style.css', 'styles/theme/_index.scss']) assert.equal(existsSync(join(root, 'packages/vue/dist', file)), false);
  records.push({ check: 'invalid shared Sass exits nonzero and removes stale assets/service', status: 'passed', exitCode: child.exitCode });
  writeFileSync(source, original); start(); await until(ready, 'recovered preview');
  await page.goto('http://127.0.0.1:5171/theme'); assert.equal(await page.getByTestId('default-sample').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(37, 99, 235)');
  await stop(); await until(async () => !await ready(), 'owned preview cleanup');
  records.push({ check: 'restored theme rebuild and managed IPC SIGINT cleanup', status: 'passed' });
  status = 'passed';
} catch (error) { records.push({ error: error.message }); process.exitCode = 1; console.error(error); }
finally {
  try { await browser?.close(); await stop(); await group.stop(); }
  catch (error) { status = 'failed'; process.exitCode = 1; records.push({ error: `cleanup: ${error.message}` }); }
  finally { writeFileSync(source, original); }
  const restored = spawnSync(process.execPath, [join(root, 'scripts/build-framework.mjs'), 'vue'], { cwd: root, encoding: 'utf8' });
  appendFileSync(log, `${restored.stdout}${restored.stderr}`);
  if (restored.status !== 0) { status = 'failed'; process.exitCode = 1; records.push({ error: 'restored build failed', exitCode: restored.status }); }
  const result = { runId, directory, status, records };
  writeFileSync(join(directory, 'watch.json'), JSON.stringify(result, null, 2));
  writeFileSync(join(root, '.artifacts/task6/watch-latest.json'), JSON.stringify(result, null, 2));
}
console.log(`Task6 design watch: ${status}; ${records.length} checks; ${directory}`);
