import { cpSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const base = resolve(root, '.artifacts/task4/portable-ci');
mkdirSync(base, { recursive: true });
const consumer = mkdtempSync(join(base, 'workspace-'));
writeFileSync(join(base, 'latest.json'), JSON.stringify({ workspace: consumer, platform: process.platform, voltaInPath: false }, null, 2) + '\n');
const runtime = join(base, 'plain-node'); const prefix = join(base, 'npm-prefix');
mkdirSync(runtime, { recursive: true }); mkdirSync(consumer, { recursive: true });
const node = join(runtime, process.platform === 'win32' ? 'node.exe' : 'node');
cpSync(process.execPath, node);
const npmCli = process.env.npm_execpath;
if (!npmCli?.endsWith('npm-cli.js')) throw Error('Run with npm run verify:ci:portable');
cpSync(resolve(dirname(npmCli), '..'), join(prefix, 'node_modules/npm'), { recursive: true });
if (process.platform === 'win32') cpSync(resolve(dirname(npmCli), '../bin/npm.cmd'), join(prefix, 'npm.cmd'));
for (const entry of ['package.json', 'package-lock.json', '.npmrc', '.node-version', '.gitignore', 'README.md', 'tsconfig.base.json', 'vitest.config.ts', 'playwright.config.ts', 'packages', 'apps', 'scripts', 'tests', 'e2e', 'docs', 'design']) {
  cpSync(join(root, entry), join(consumer, entry), { recursive: true, filter: path => !relative(root, path).split(/[\\/]/).some(part => ['node_modules', 'dist', 'coverage', '.artifacts', '.angular', '.generated'].includes(part)) });
}
const env = { ...process.env, PATH: process.platform === 'win32' ? `${prefix};${runtime};${process.env.SystemRoot}\\System32` : `${prefix}/node_modules/npm/bin:${runtime}:/usr/bin:/bin`, CI: 'true' };
for (const key of Object.keys(env)) if (/^(volta|npm_execpath|npm_node_execpath|ZOOM_)/i.test(key)) delete env[key];
const results = [];
const cli = join(prefix, 'node_modules/npm/bin/npm-cli.js');
function run(label, executable, args) {
  const result = spawnSync(executable, args, { cwd: consumer, env, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 });
  writeFileSync(join(base, `${label}.log`), (result.stdout ?? '') + (result.stderr ?? ''));
  results.push({ label, status: result.status, error: result.error?.message });
  writeFileSync(join(base, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`${label}: exit ${result.status}`);
  if (result.error || result.status !== 0) throw Error(`${label}: ${result.error?.message ?? 'see log'}`);
}
const volta = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['volta'], { env, encoding: 'utf8' });
if (volta.status === 0) throw Error('Volta unexpectedly present');
console.log('Volta absent from PATH; source and artifacts isolated from original workspace');
run('node-version', node, ['--version']); run('npm-version', node, [cli, '--version']);
const lock = readFileSync(join(consumer, 'package-lock.json'), 'utf8');
run('npm-ci', node, [cli, 'ci', '--no-audit', '--no-fund']);
if (readFileSync(join(consumer, 'package-lock.json'), 'utf8') !== lock) throw Error('npm ci changed lockfile');
run('ci-verify', node, [cli, 'run', 'ci:verify']);
const report = JSON.parse(readFileSync(join(consumer, '.artifacts/task1/toolchain-report.json'), 'utf8'));
for (const dependency of report.resolved) {
  const path = relative(consumer, dependency.path);
  if (path.startsWith('..') || isAbsolute(path)) throw Error(`Dependency escaped clean CI copy: ${dependency.path}`);
}
console.log('Clean ordinary Node/npm CI passed; product packed consumers remain Task5');
