// Reproduce Task1 outside workspace resolution, with a PATH that contains no Volta.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const base = resolve(root, '.artifacts/task1/portable');
const runtime = join(base, 'plain-node');
const prefix = join(base, 'npm-prefix');
const consumer = join(base, 'workspace');
mkdirSync(runtime, { recursive: true }); mkdirSync(consumer, { recursive: true });
const node = join(runtime, process.platform === 'win32' ? 'node.exe' : 'node');
cpSync(process.execPath, node);
const npmCli = process.env.npm_execpath;
if (!npmCli?.endsWith('npm-cli.js')) throw Error('Run with npm run verify:portable');
cpSync(resolve(dirname(npmCli), '..'), join(prefix, 'node_modules/npm'), { recursive: true });
// Standard Windows npm prefix layout. The checker resolves the JS entry without executing a shell.
if (process.platform === 'win32') cpSync(resolve(dirname(npmCli), '../bin/npm.cmd'), join(prefix, 'npm.cmd'));
for (const file of ['package.json', 'package-lock.json', '.npmrc', '.node-version']) cpSync(join(root, file), join(consumer, file));
for (const directory of ['scripts', 'docs/engineering', 'tests/engineering']) cpSync(join(root, directory), join(consumer, directory), { recursive: true });
for (const directory of ['packages/core', 'packages/dom', 'packages/vue', 'packages/react', 'packages/angular', 'apps/platform-smoke', 'apps/vue-smoke', 'apps/react-smoke', 'apps/angular-smoke']) {
  mkdirSync(join(consumer, directory), { recursive: true }); cpSync(join(root, directory, 'package.json'), join(consumer, directory, 'package.json'));
}
const env = { ...process.env, PATH: process.platform === 'win32' ? `${prefix};${runtime};${process.env.SystemRoot}\\System32` : `${prefix}/node_modules/npm/bin:${runtime}:/usr/bin:/bin` };
for (const key of Object.keys(env)) if (/^(volta|npm_execpath|npm_node_execpath)/i.test(key)) delete env[key];
const results = [];
function run(label, executable, args) {
  const result = spawnSync(executable, args, { cwd: consumer, env, encoding: 'utf8', shell: false });
  const entry = { label, status: result.status, stdout: result.stdout, stderr: result.stderr, error: result.error?.message };
  results.push(entry); writeFileSync(join(base, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`${label}: exit ${result.status}`);
  if (result.status !== 0) throw Error(`${label}: ${result.error?.message ?? result.stderr}`);
}
const probe = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['volta'], { cwd: consumer, env, encoding: 'utf8' });
if (probe.status === 0) throw Error(`Volta unexpectedly present: ${probe.stdout}`);
console.log('Volta absent from PATH');
const cli = join(prefix, 'node_modules/npm/bin/npm-cli.js');
run('plain node', node, ['--version']); run('plain npm', node, [cli, '--version']);
const lockBefore = readFileSync(join(consumer, 'package-lock.json'), 'utf8');
run('npm ci without Volta', node, [cli, 'ci', '--no-audit', '--no-fund']);
if (readFileSync(join(consumer, 'package-lock.json'), 'utf8') !== lockBefore) throw Error('npm ci changed lockfile');
run('npm run check:versions without Volta', node, [cli, 'run', 'check:versions']);
run('standalone checker without Volta', node, ['scripts/check-toolchain.mjs']);
const report = JSON.parse(readFileSync(join(consumer, '.artifacts/task1/toolchain-report.json'), 'utf8'));
for (const dependency of report.resolved) if (!dependency.path.startsWith(consumer + (process.platform === 'win32' ? '\\' : '/'))) throw Error(`Dependency escaped portable workspace: ${dependency.path}`);
run('toolchain tests without Volta', node, [cli, 'run', 'test:engineering', '--', 'tests/engineering/toolchain.spec.ts']);
