import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runBin, resolveBin } from './run-local-bin.mjs';
import { probeNpm } from './check-toolchain.mjs';
import { validatePlatformPack } from './platform-contracts.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function compile(label, workspace, config) {
  const compiler = resolveBin(join(root, workspace), 'typescript', 'tsc');
  const expected = workspace === 'packages/vue' ? '6.0.3' : '7.0.2';
  if (compiler.version !== expected) throw Error(`${label}: expected TS${expected}, resolved ${compiler.version} at ${compiler.path}`);
  const result = runBin(join(root, workspace), 'typescript', 'tsc', ['-p', join(root, config)], 'pipe');
  results.push({ label, compilerVersion: compiler.version, compilerPath: compiler.path, config, status: result.status, stdout: result.stdout, stderr: result.stderr });
  if (result.status !== 0) throw Error(`${label}: ${result.stdout}${result.stderr}`);
  console.log(`${label}: PASS`);
}
try {
  compile('Core production ambient type exclusions', 'packages/core', 'tests/engineering/declarations/tsconfig.core-environment.json');
  compile('TS7 fixture declaration emit', 'packages/core', 'tests/engineering/declarations/tsconfig.emit.json');
  compile('TS6 consumes TS7 fixtures and public declarations', 'packages/vue', 'tests/engineering/declarations/tsconfig.consumer.json');
  compile('TS7 consumes fixtures and public declarations', 'packages/core', 'tests/engineering/declarations/tsconfig.consumer.json');
  const npm = probeNpm();
  if (!npm.path || !npm.version) throw Error('Cannot resolve current npm for pack dry run');
  for (const name of ['core', 'dom']) {
    const args = ['pack', '--dry-run', '--json', '--cache', join(root, '.artifacts/task2/npm-cache'), '--workspace', `@zoom-design/${name}`];
    const isJS = npm.path.endsWith('.js');
    const result = spawnSync(isJS ? process.execPath : npm.path, isJS ? [npm.path, ...args] : args, { cwd: root, encoding: 'utf8', shell: false });
    if (result.status !== 0) throw Error(`${name}: npm pack dry run failed: ${result.stderr}`);
    // npm12 keys JSON reports by package name; do not assume the older array format.
    const packed = JSON.parse(result.stdout)[`@zoom-design/${name}`];
    if (!Array.isArray(packed?.files) || packed.files.length === 0) throw Error(`${name}: pack report has no files`);
    const files = packed.files.map(file => file.path);
    const errors = validatePlatformPack(name, files);
    if (errors.length) throw Error(errors.join('\n'));
    results.push({ label: `${name} pack dry run`, status: 0, files });
    console.log(`${name} package contents: PASS (${files.length} files)`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  mkdirSync(join(root, '.artifacts/task2'), { recursive: true });
  writeFileSync(join(root, '.artifacts/task2/platform-checks.json'), JSON.stringify(results, null, 2) + '\n');
}
