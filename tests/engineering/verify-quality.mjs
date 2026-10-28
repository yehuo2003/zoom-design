import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, readdirSync, existsSync, cpSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { root } from '../../scripts/workspace.mjs';
import { ProcessGroup } from '../../scripts/process-group.mjs';

const directory = join(root, '.artifacts/task4/negative');
mkdirSync(directory, { recursive: true });
const resumeFrom = process.argv[2];
let started = !resumeFrom;
const results = resumeFrom ? JSON.parse(readFileSync(join(directory, 'results.json'), 'utf8')) : [];
function withinRoot(file) {
  const path = relative(root, file);
  assert.ok(path && !path.startsWith('..') && !isAbsolute(path), `Unsafe verification path: ${file}`);
  return file;
}
async function command(label, args, expected, diagnostic) {
  if (!started && label === resumeFrom) started = true;
  if (!started) return;
  const group = new ProcessGroup();
  const child = group.start(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], transient: true, env: { ...process.env, CI: 'true' } });
  let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
  const status = await new Promise((accept, reject) => {
    const timer = setTimeout(() => { group.stop().then(() => reject(Error(`${label}: timed out`)), reject); }, 180000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => { clearTimeout(timer); accept(code); });
  });
  writeFileSync(join(directory, `${label}.log`), output);
  if (args[0] === 'scripts/e2e.mjs') {
    const selection = args[args.indexOf('--package') + 1];
    const report = join(root, `.artifacts/task4/playwright/workspace/${selection}-chromium`);
    const archive = join(directory, `${label}-artifacts`); mkdirSync(archive, { recursive: true });
    for (const entry of ['results.json', 'test-results']) if (existsSync(join(report, entry))) cpSync(join(report, entry), join(archive, entry), { recursive: true });
  }
  if (expected === 'failure') assert.ok(Number.isInteger(status) && status !== 0, `${label}: expected nonzero exit`);
  else assert.equal(status, 0, `${label}: ${output.slice(-3000)}`);
  if (diagnostic) assert.match(output, diagnostic, `${label}: failed for the wrong reason`);
  const previous = results.findIndex(result => result.check === label);
  if (previous >= 0) results.splice(previous, 1);
  results.push({ check: label, expected, exitCode: status, status: 'PASS' });
  writeFileSync(join(directory, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`${label}: verified exit ${status}`);
}
const e2eArgs = name => ['scripts/e2e.mjs', '--mode', 'workspace', '--package', name, '--browser', 'chromium'];
async function injectedE2E(label, body, diagnostic) {
  const file = withinRoot(join(root, `e2e/core/negative-${randomUUID()}.e2e.ts`));
  writeFileSync(file, `import {test,expect} from '../fixtures';\n${body}`, { flag: 'wx' });
  try { await command(label, e2eArgs('core'), 'failure', diagnostic); }
  finally { rmSync(file); }
}
async function mutated(label, file, from, to, args, diagnostic) {
  withinRoot(file);
  const original = readFileSync(file);
  const before = createHash('sha256').update(original).digest('hex');
  assert.ok(original.toString().includes(from), `${label}: source no longer matches controlled mutation`);
  try { writeFileSync(file, original.toString().replace(from, to)); await command(label, args, 'failure', diagnostic); }
  finally { writeFileSync(file, original); assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), before); }
}
try {
  const unit = withinRoot(join(root, `packages/core/test/quality-negative-${randomUUID()}.spec.ts`));
  writeFileSync(unit, 'import {it,expect} from "vitest";it("Task4 deliberate real unit failure",()=>expect(0).toBe(1));', { flag: 'wx' });
  try {
    await command('unit-root-failure', ['scripts/workspace.mjs', 'unit', '--package', 'core'], 'failure', /Task4 deliberate real unit failure/);
    await command('check-root-failure', ['scripts/check.mjs', '--package', 'core'], 'failure', /Task4 deliberate real unit failure/);
    await command('ci-root-failure', ['scripts/ci.mjs', '--package', 'core', '--browser', 'chromium'], 'failure', /Task4 deliberate real unit failure/);
  } finally { rmSync(unit); }

  const coreTest = withinRoot(join(root, 'packages/core/test/engineering.spec.ts'));
  const backup = withinRoot(join(directory, `core-${randomUUID()}.backup`));
  renameSync(coreTest, backup);
  try {
    await command('empty-unit-rejected', ['scripts/test-unit.mjs', '--standalone', '--package', 'core'], 'failure', /No test files found|core: no executed passing tests/);
    writeFileSync(coreTest, 'import {it} from "vitest";it.skip("Task4 skip-only control",()=>{});', { flag: 'wx' });
    await command('skipped-unit-rejected', ['scripts/test-unit.mjs', '--standalone', '--package', 'core'], 'failure', /non-passing test|no executed passing tests/);
    rmSync(coreTest);
  } finally {
    rmSync(coreTest, { force: true });
    renameSync(backup, coreTest);
  }

  await injectedE2E('console-error-rejected', 'test("Task4 unexpected console",async({page})=>{await page.goto("/core");await page.evaluate(()=>console.error("Task4 unexpected console"));});', /Unexpected pageerror\/console.error/);
  await injectedE2E('page-error-rejected', 'test("Task4 unexpected pageerror",async({page})=>{await page.goto("/core");const error=page.waitForEvent("pageerror");await page.evaluate(()=>queueMicrotask(()=>{throw Error("Task4 unexpected pageerror")}));await error;});', /Unexpected pageerror\/console.error/);

  const occupied = createServer((_request, response) => response.end(JSON.stringify({ app: 'platform', mode: 'workspace', runId: 'old-run' })));
  await new Promise((accept, reject) => { occupied.once('error', reject); occupied.listen(4170, '127.0.0.1', accept); });
  try { await command('occupied-port-rejected', e2eArgs('core'), 'failure', /already used|EADDRINUSE|already in use/); }
  finally { await new Promise(accept => { occupied.close(accept); occupied.closeAllConnections(); }); }

  const stale = createServer((_request, response) => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ app: 'platform', mode: 'workspace', runId: 'old-run' })); });
  await new Promise(accept => stale.listen(0, '127.0.0.1', accept));
  try {
    await injectedE2E('stale-run-id-rejected', `test.use({baseURL:'http://127.0.0.1:${stale.address().port}'});test('Task4 stale readiness',async()=>{});`, /old-run/);
  } finally { await new Promise(accept => { stale.close(accept); stale.closeAllConnections(); }); }

  await mutated('wrong-counter-rejected', join(root, 'apps/platform-smoke/src/main.ts'), 'state.update(value => value + 1)', 'state.update(value => value + 2)', e2eArgs('core'), /Expected.*1|toHaveText/s);
  await mutated('missing-unmount-rejected', join(root, 'apps/angular-smoke/src/app.ts'), 'mounted.set(false)', 'mounted.set(true)', e2eArgs('angular'), /Probe mount status|unmounted|toHaveText/);
  await command('angular-restored', e2eArgs('angular'), 'success');
  assert.ok(started, `Unknown resume point ${resumeFrom}`);

  const traceFiles = [];
  function walk(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) { const file = join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (/trace\.zip|test-failed.*\.png/.test(entry.name)) traceFiles.push(file); } }
  walk(join(root, '.artifacts/task4/playwright/workspace'));
  assert.ok(traceFiles.some(file => file.endsWith('trace.zip')) && traceFiles.some(file => file.endsWith('.png')), 'Failed browser runs must preserve trace and screenshot');
  writeFileSync(join(directory, 'failure-artifacts.json'), JSON.stringify(traceFiles, null, 2) + '\n');
  console.log(`Quality failure gates: ${results.length}/${results.length} verified; trace/screenshots retained`);
} catch (error) { console.error(error); process.exitCode = 1; }
